import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEnum, IsString } from 'class-validator';
import { GiftCard, GiftCardStatus, Role } from '../entities';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { GiftCardsService } from './gift-cards.service';

class CheckDto {
  @IsString()
  code: string;
}

class StatusDto {
  @IsEnum(GiftCardStatus)
  status: GiftCardStatus;
}

@Controller()
export class GiftCardsController {
  constructor(
    private readonly service: GiftCardsService,
    @InjectRepository(GiftCard) private readonly cards: Repository<GiftCard>,
  ) {}

  @Post('gift-cards/check')
  async check(@Body() dto: CheckDto) {
    const card = await this.service.check(dto.code);
    return { code: card.code, balance: card.balance, expiresAt: card.expiresAt };
  }

  @Get('admin/gift-cards')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  list() {
    return this.cards.find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  @Patch('admin/gift-cards/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async setStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    const card = await this.cards.findOne({ where: { id } });
    if (!card) throw new NotFoundException('Hediye kartı bulunamadı.');
    card.status = dto.status;
    return this.cards.save(card);
  }
}
