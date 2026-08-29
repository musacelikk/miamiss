import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Role } from '../entities';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { ShippingService } from './shipping.service';

class CreateShipmentDto {
  @IsOptional()
  @IsString()
  offerId?: string;
}

/** Kargo icin teslimat bilgisi duzeltmesi (gonderi olusmadan once). */
class UpdateShippingInfoDto {
  @IsOptional()
  @IsString()
  shippingName?: string;

  @IsOptional()
  @IsString()
  shippingPhone?: string;

  @IsOptional()
  @IsString()
  shippingCity?: string;

  @IsOptional()
  @IsString()
  shippingDistrict?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  shippingZip?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(300)
  shippingDesi?: number;
}

@Controller('admin/orders/:orderId/shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOrderShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Get('offers')
  offers(@Param('orderId') orderId: string) {
    return this.shipping.offersForOrder(orderId);
  }

  @Post()
  create(@Param('orderId') orderId: string, @Body() dto: CreateShipmentDto) {
    return this.shipping.createForOrder(orderId, dto.offerId);
  }

  /** Kargo oncesi teslimat bilgisi / desi duzeltmesi. */
  @Patch('info')
  updateInfo(
    @Param('orderId') orderId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: UpdateShippingInfoDto,
  ) {
    return this.shipping.updateShippingInfo(orderId, dto);
  }

  @Delete()
  cancel(@Param('orderId') orderId: string) {
    return this.shipping.cancelForOrder(orderId);
  }
}

@Controller('admin/shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Get('config')
  config() {
    return { enabled: this.shipping.enabled };
  }
}

@Controller('shipping')
export class ShippingWebhookController {
  constructor(
    private readonly shipping: ShippingService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Geliver panelinde webhook olusturulurken ozel header tanimlanir:
   * headerName = "x-geliver-token", headerValue = GELIVER_WEBHOOK_SECRET.
   * Token URL'de tasinmaz (loglara sizmasin), karsilastirma sabit zamanlidir.
   */
  @Post('geliver/webhook')
  async webhook(
    @Headers('x-geliver-token') token: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    const secret = this.config.get<string>('GELIVER_WEBHOOK_SECRET');
    if (!secret) throw new UnauthorizedException();
    const a = Buffer.from(secret);
    const b = Buffer.from(token ?? '');
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException();
    await this.shipping.handleWebhook(payload);
    return { ok: true };
  }
}
