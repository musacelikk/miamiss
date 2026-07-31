import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportMessage, SupportTicket } from '../entities';
import { SupportController } from './support.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket, SupportMessage])],
  controllers: [SupportController],
})
export class SupportModule {}
