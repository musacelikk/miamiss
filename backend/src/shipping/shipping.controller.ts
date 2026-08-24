import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import { Role } from '../entities';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { ShippingService } from './shipping.service';

class CreateShipmentDto {
  @IsOptional()
  @IsString()
  offerId?: string;
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

  /** Geliver panelinde webhook adresi ?token=GELIVER_WEBHOOK_SECRET ile tanimlanir. */
  @Post('geliver/webhook')
  async webhook(@Query('token') token: string, @Body() payload: Record<string, unknown>) {
    const secret = this.config.get<string>('GELIVER_WEBHOOK_SECRET');
    if (!secret || token !== secret) throw new UnauthorizedException();
    await this.shipping.handleWebhook(payload);
    return { ok: true };
  }
}
