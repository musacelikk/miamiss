import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, ReturnRequest } from '../entities';
import { ReturnsController } from './returns.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReturnRequest, Order])],
  controllers: [ReturnsController],
})
export class ReturnsModule {}
