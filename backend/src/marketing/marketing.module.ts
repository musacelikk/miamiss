import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingOptout, MarketingTemplate, User } from '../entities';
import { MarketingController } from './marketing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MarketingTemplate, User, MarketingOptout])],
  controllers: [MarketingController],
})
export class MarketingModule {}
