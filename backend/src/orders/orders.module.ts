import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GiftCard, Order, OrderItem, Product } from '../entities';
import { CouponsModule } from '../coupons/coupons.module';
import { GiftCardsModule } from '../gift-cards/gift-cards.module';
import { SettingsModule } from '../settings/settings.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, GiftCard]),
    CouponsModule,
    GiftCardsModule,
    SettingsModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController, AdminOrdersController],
})
export class OrdersModule {}
