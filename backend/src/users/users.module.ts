import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Address, Favorite, Order, Product, Review, User } from '../entities';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Address, Favorite, Product, Order, Review])],
  controllers: [UsersController, AdminUsersController],
})
export class UsersModule {}
