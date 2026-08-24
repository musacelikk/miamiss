import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../entities';
import { OrdersModule } from '../orders/orders.module';
import { PaytrService } from './paytr.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), OrdersModule],
  providers: [PaytrService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
