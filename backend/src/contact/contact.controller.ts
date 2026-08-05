import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ContactMessage, Role } from '../entities';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { MailService } from '../mail/mail.service';

class ContactDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  @MinLength(5)
  message: string;
}

@Controller()
export class ContactController {
  constructor(
    @InjectRepository(ContactMessage) private readonly messages: Repository<ContactMessage>,
    private readonly mail: MailService,
  ) {}

  @Post('contact')
  async create(@Body() dto: ContactDto) {
    await this.messages.save(this.messages.create(dto));
    this.mail.contactMessageAdmin({
      name: dto.name,
      email: dto.email,
      subject: dto.subject ?? null,
      message: dto.message,
    });
    return { ok: true, message: 'Mesajınız alındı, en kısa sürede dönüş yapacağız.' };
  }

  @Get('admin/contact-messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  list() {
    return this.messages.find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  @Patch('admin/contact-messages/:id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async markRead(@Param('id') id: string) {
    await this.messages.update({ id }, { isRead: true });
    return { ok: true };
  }

  @Delete('admin/contact-messages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    await this.messages.delete({ id });
    return { ok: true };
  }
}
