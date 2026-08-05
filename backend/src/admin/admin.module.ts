import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactMessage, Coupon, Favorite, Order, Product, Review, User } from '../entities';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Product, User, Review, ContactMessage, Favorite, Coupon]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
