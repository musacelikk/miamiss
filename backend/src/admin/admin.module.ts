import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactMessage, Order, Product, Review, User } from '../entities';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Product, User, Review, ContactMessage])],
  controllers: [AdminController],
})
export class AdminModule {}
