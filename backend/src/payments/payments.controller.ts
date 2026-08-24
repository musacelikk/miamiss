import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsUUID, Matches, MinLength } from 'class-validator';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Order, PaymentMethod, PaymentStatus } from '../entities';
import { OrdersService } from '../orders/orders.service';
import { LogsService } from '../logs/logs.service';
import { PaytrService } from './paytr.service';

class StartPaytrDto {
  @IsUUID()
  orderId: string;

  @IsString()
  @MinLength(3)
  cardHolder: string;

  @Matches(/^\d{15,16}$/, { message: 'Kart numarası 15-16 haneli olmalıdır.' })
  cardNumber: string;

  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'Son kullanma ayı geçersiz.' })
  expiryMonth: string;

  @Matches(/^\d{2}$/, { message: 'Son kullanma yılı geçersiz.' })
  expiryYear: string;

  @Matches(/^\d{3,4}$/, { message: 'CVV geçersiz.' })
  cvv: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paytr: PaytrService,
    private readonly ordersService: OrdersService,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly logs: LogsService,
    private readonly config: ConfigService,
  ) {}

  @Get('config')
  getConfig() {
    return { cardEnabled: this.paytr.enabled };
  }

  @Post('paytr/start')
  async start(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: StartPaytrDto,
    @Req() req: Request,
  ) {
    const order = await this.orders.findOne({
      where: { id: dto.orderId },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    if (order.paymentMethod !== PaymentMethod.CARD) {
      throw new BadRequestException('Bu sipariş kart ödemeli değil.');
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Bu siparişin ödemesi zaten alınmış.');
    }
    if (!order.paytrMerchantOid) {
      throw new BadRequestException('Sipariş ödeme referansı eksik.');
    }

    const site = this.config.get<string>('PUBLIC_SITE_URL') ?? 'http://localhost:3000';
    // trust proxy acik; ::ffff: onekli IPv4'u temizle
    const userIp = (req.ip ?? '127.0.0.1').replace(/^::ffff:/, '');

    const html = await this.paytr.startPayment({
      merchantOid: order.paytrMerchantOid,
      email: order.email,
      amount: order.grandTotal,
      userIp,
      userName: order.shippingName,
      userAddress: `${order.shippingAddress} ${order.shippingDistrict}/${order.shippingCity}`,
      userPhone: order.shippingPhone,
      basket: order.items.map(
        (i) => [i.name, i.unitPrice.toFixed(2), i.quantity] as [string, string, number],
      ),
      okUrl: `${site}/siparis-basarili?paytr=1`,
      failUrl: `${site}/odeme?payment=failed&orderNo=${order.orderNo}`,
      card: {
        cardHolder: dto.cardHolder,
        cardNumber: dto.cardNumber,
        expiryMonth: dto.expiryMonth,
        expiryYear: dto.expiryYear,
        cvv: dto.cvv,
      },
    });

    this.logs.record({
      userId: order.userId,
      email: order.email,
      actorType: 'CUSTOMER',
      action: 'payment.start',
      detail: `${order.orderNo} — 3D ödeme başlatıldı`,
    });

    return { html };
  }

  /** PayTR sunucu-sunucu bildirimi. Her kosulda duz "OK" bekler. */
  @Post('paytr/callback')
  async callback(@Body() body: Record<string, string>) {
    if (!this.paytr.verifyCallback(body)) {
      throw new BadRequestException('Geçersiz imza.');
    }
    const order = await this.orders.findOne({
      where: { paytrMerchantOid: body.merchant_oid },
    });
    // Bilinmeyen bildirim: OK donulur ki PayTR tekrar tekrar denemesin.
    if (!order) return 'OK';
    if (order.paymentStatus === PaymentStatus.PAID) return 'OK';

    if (body.status === 'success') {
      await this.ordersService.setPaymentStatus(order.id, PaymentStatus.PAID);
      this.logs.record({
        userId: null,
        email: order.email,
        actorType: 'GUEST',
        action: 'payment.success',
        detail: `${order.orderNo} — PayTR ödemesi onaylandı (${body.total_amount})`,
      });
    } else {
      await this.ordersService.setPaymentStatus(order.id, PaymentStatus.FAILED);
      this.logs.record({
        userId: null,
        email: order.email,
        actorType: 'GUEST',
        action: 'payment.failed',
        detail: `${order.orderNo} — PayTR ödemesi başarısız (${body.failed_reason_msg ?? '-'})`,
      });
    }
    return 'OK';
  }
}
