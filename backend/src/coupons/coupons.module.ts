import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from '../entities';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon]), SettingsModule],
  providers: [CouponsService],
  controllers: [CouponsController],
  exports: [CouponsService],
})
export class CouponsModule {}
