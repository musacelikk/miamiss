import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon, GiftCard, Order, OrderItem, Product, ProductVariant } from '../entities';
import { CouponsModule } from '../coupons/coupons.module';
import { GiftCardsModule } from '../gift-cards/gift-cards.module';
import { SettingsModule } from '../settings/settings.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, ProductVariant, GiftCard, Coupon]),
    CouponsModule,
    GiftCardsModule,
    SettingsModule,
    ShippingModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController, AdminOrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
