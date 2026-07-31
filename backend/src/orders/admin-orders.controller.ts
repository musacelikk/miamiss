import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Order, OrderStatus, PaymentStatus, Role } from '../entities';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type AuthUser } from '../auth/guards';
import { OrdersService } from './orders.service';
import { MailService } from '../mail/mail.service';
import { LogsService } from '../logs/logs.service';

class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  trackingNo?: string;

  @IsOptional()
  @IsString()
  cargoCompany?: string;
}

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOrdersController {
  constructor(
    private readonly service: OrdersService,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly mail: MailService,
    private readonly logs: LogsService,
  ) {}

  @Get()
  async list(@Query('status') status?: OrderStatus, @Query('page') page?: string) {
    const take = 50;
    const currentPage = Math.max(1, page ? parseInt(page, 10) : 1);
    const [items, total] = await this.orders.findAndCount({
      where: status ? { status } : {},
      relations: { items: true, user: true },
      order: { createdAt: 'DESC' },
      take,
      skip: (currentPage - 1) * take,
    });
    return { items, total, page: currentPage, pageCount: Math.ceil(total / take) };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const order = await this.orders.findOne({
      where: { id },
      relations: { items: { boughtGiftCard: true }, user: true, coupon: true, giftCard: true },
    });
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    return order;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() admin: AuthUser,
  ) {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');

    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'order.update',
      detail: `${order.orderNo} — ${[
        dto.status && `durum: ${dto.status}`,
        dto.paymentStatus && `ödeme: ${dto.paymentStatus}`,
        dto.trackingNo !== undefined && `takip: ${dto.trackingNo || '-'}`,
      ]
        .filter(Boolean)
        .join(', ')}`,
    });

    if (dto.status === OrderStatus.CANCELLED) {
      return this.service.cancel(id);
    }
    if (dto.paymentStatus && dto.paymentStatus !== order.paymentStatus) {
      await this.service.setPaymentStatus(id, dto.paymentStatus);
    }
    if (dto.status && dto.status !== order.status) {
      await this.service.setStatus(id, dto.status);
    }
    const patch: Partial<Order> = {};
    if (dto.trackingNo !== undefined) patch.trackingNo = dto.trackingNo;
    if (dto.cargoCompany !== undefined) patch.cargoCompany = dto.cargoCompany;
    if (Object.keys(patch).length) await this.orders.update({ id }, patch);

    // Kargoya verildi bildirimi
    if (dto.status === OrderStatus.SHIPPED && order.status !== OrderStatus.SHIPPED) {
      this.mail.orderShipped(
        order.email,
        order.orderNo,
        dto.cargoCompany ?? order.cargoCompany,
        dto.trackingNo ?? order.trackingNo,
      );
    }

    return this.orders.findOne({ where: { id }, relations: { items: true } });
  }

  /** Siparisi kalici olarak siler (once iptal etmek stok iadesi saglar). */
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() admin: AuthUser) {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    await this.orders.delete({ id });
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'order.delete',
      detail: `${order.orderNo} kalıcı olarak silindi (${order.shippingName}, ${order.grandTotal} TL)`,
    });
    return { ok: true };
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() admin: AuthUser) {
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'order.cancel',
      detail: `Sipariş iptal edildi (${id})`,
    });
    return this.service.cancel(id);
  }
}
