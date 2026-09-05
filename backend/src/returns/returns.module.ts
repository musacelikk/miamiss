import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, ReturnRequest } from '../entities';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  // ShippingModule: onaylanan iade icin Geliver ters yonlu gonderisi
  imports: [TypeOrmModule.forFeature([ReturnRequest, Order]), ShippingModule],
  controllers: [ReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
