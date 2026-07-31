import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingTemplate, User } from '../entities';
import { MarketingController } from './marketing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MarketingTemplate, User])],
  controllers: [MarketingController],
})
export class MarketingModule {}
