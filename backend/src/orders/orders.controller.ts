import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  IsArray,
  IsEmail,
  IsIn,
  Matches,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../entities';
import { OrdersService } from './orders.service';
import { CurrentUser, JwtAuthGuard, OptionalJwtAuthGuard, type AuthUser } from '../auth/guards';
import { SettingsService } from '../settings/settings.service';
import { LogsService } from '../logs/logs.service';

class OrderItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

class GiftCardItemDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

class CreateOrderDto {
  @IsEmail()
  email: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GiftCardItemDto)
  giftCardItems?: GiftCardItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  giftCardCode?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @MinLength(3)
  shippingName: string;

  @IsString()
  @MinLength(7)
  shippingPhone: string;

  @IsString()
  shippingCity: string;

  @IsString()
  shippingDistrict: string;

  @IsString()
  @MinLength(10)
  shippingAddress: string;

  @IsOptional()
  @IsString()
  shippingZip?: string;

  @IsOptional()
  @IsString()
  note?: string;

  /* Fatura bilgileri */
  @IsOptional()
  @IsIn(['INDIVIDUAL', 'CORPORATE'])
  invoiceType?: 'INDIVIDUAL' | 'CORPORATE';

  @IsOptional()
  @Matches(/^\d{11}$/, { message: 'TC kimlik numarası 11 haneli olmalıdır.' })
  invoiceTckn?: string;

  @IsOptional()
  @IsString()
  invoiceCompanyName?: string;

  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'Vergi numarası 10 haneli olmalıdır.' })
  invoiceTaxNo?: string;

  @IsOptional()
  @IsString()
  invoiceTaxOffice?: string;

  @IsOptional()
  @IsString()
  invoiceAddress?: string;
}

class CancelOrderDto {
  @IsString()
  orderNo: string;

  @IsEmail()
  email: string;
}

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly settings: SettingsService,
    private readonly logs: LogsService,
  ) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async create(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateOrderDto,
    @CurrentUser() user: AuthUser | null,
  ) {
    const order = await this.service.create({ ...dto, userId: user?.id ?? null });
    this.logs.record({
      userId: user?.id ?? null,
      email: order.email,
      actorType: user ? 'CUSTOMER' : 'GUEST',
      action: 'order.create',
      detail: `${order.orderNo} — ${order.grandTotal.toLocaleString('tr-TR')} TL (${order.paymentMethod})`,
    });
    const store = await this.settings.get();
    return {
      orderNo: order.orderNo,
      grandTotal: order.grandTotal,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      bank:
        order.paymentMethod === PaymentMethod.BANK_TRANSFER
          ? { bankName: store.bankName, ibanName: store.ibanName, iban: store.iban }
          : null,
    };
  }

  @Get('track')
  track(@Query('orderNo') orderNo: string, @Query('email') email: string) {
    return this.service.track(orderNo ?? '', email ?? '');
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.service.listForUser(user!.id);
  }

  /** Kargoya verilmemis siparisin musteri tarafindan iptali. */
  @Post('cancel')
  @UseGuards(OptionalJwtAuthGuard)
  async cancel(@Body() dto: CancelOrderDto, @CurrentUser() user: AuthUser | null) {
    const order = await this.service.cancelByCustomer(dto.orderNo, dto.email);
    this.logs.record({
      userId: user?.id ?? null,
      email: order.email,
      actorType: user ? 'CUSTOMER' : 'GUEST',
      action: 'order.cancel',
      detail: `${order.orderNo} müşteri tarafından iptal edildi`,
    });
    return { ok: true, orderNo: order.orderNo, status: order.status };
  }
}
