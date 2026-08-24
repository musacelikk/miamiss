import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../entities';
import { SettingsModule } from '../settings/settings.module';
import { GeliverService } from './geliver.service';
import { ShippingService } from './shipping.service';
import {
  AdminOrderShippingController,
  AdminShippingController,
  ShippingWebhookController,
} from './shipping.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), SettingsModule],
  providers: [GeliverService, ShippingService],
  controllers: [AdminOrderShippingController, AdminShippingController, ShippingWebhookController],
  exports: [ShippingService],
})
export class ShippingModule {}
