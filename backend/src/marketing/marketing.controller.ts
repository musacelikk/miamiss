import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { MarketingTemplate, Role, User } from '../entities';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type AuthUser } from '../auth/guards';
import { MailService } from '../mail/mail.service';
import { LogsService } from '../logs/logs.service';

class TemplateDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsIn(['EMAIL', 'SMS'])
  type: 'EMAIL' | 'SMS';

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  content: string;
}

class SendDto {
  @IsString()
  templateId: string;

  /** ALL: pazarlama izni olan tum uyeler */
  @IsIn(['ALL', 'WITH_ORDERS'])
  audience: 'ALL' | 'WITH_ORDERS';

  /** Doluysa kampanya herkese degil sadece bu adrese test olarak gider */
  @IsOptional()
  @IsEmail()
  testEmail?: string;
}

@Controller('admin/marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MarketingController {
  constructor(
    @InjectRepository(MarketingTemplate)
    private readonly templates: Repository<MarketingTemplate>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly mail: MailService,
    private readonly logs: LogsService,
  ) {}

  @Get('templates')
  list() {
    return this.templates.find({ order: { updatedAt: 'DESC' } });
  }

  @Post('templates')
  create(@Body() dto: TemplateDto) {
    return this.templates.save(
      this.templates.create({ ...dto, subject: dto.subject ?? null }),
    );
  }

  @Patch('templates/:id')
  async update(@Param('id') id: string, @Body() dto: TemplateDto) {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Şablon bulunamadı.');
    Object.assign(template, dto, { subject: dto.subject ?? null });
    return this.templates.save(template);
  }

  @Delete('templates/:id')
  async remove(@Param('id') id: string) {
    const result = await this.templates.delete({ id });
    if (!result.affected) throw new NotFoundException('Şablon bulunamadı.');
    return { ok: true };
  }

  @Post('send')
  async send(@Body() dto: SendDto, @CurrentUser() admin: AuthUser) {
    const template = await this.templates.findOne({ where: { id: dto.templateId } });
    if (!template) throw new NotFoundException('Şablon bulunamadı.');

    if (template.type === 'SMS') {
      throw new BadRequestException(
        'SMS gönderimi Netgsm entegrasyonu tamamlanınca aktif olacak. Şablonunuz hazır, kaydedildi.',
      );
    }
    if (!template.subject?.trim()) {
      throw new BadRequestException('E-posta şablonunda konu (subject) zorunludur.');
    }

    // Test gonderimi: yalnizca verilen adrese
    if (dto.testEmail) {
      this.mail.sendMarketing(dto.testEmail, template.subject, template.content, 'Test Kullanıcı');
      return { ok: true, sent: 1, test: true };
    }

    // Hedef kitle: pazarlama iznini kapatmamis musteriler
    const qb = this.users
      .createQueryBuilder('u')
      .where('u.role = :role', { role: Role.CUSTOMER })
      .andWhere('u.acceptsMarketing = true');
    if (dto.audience === 'WITH_ORDERS') {
      qb.andWhere('EXISTS (SELECT 1 FROM orders o WHERE o."userId" = u.id)');
    }
    const recipients = await qb.getMany();

    for (const user of recipients) {
      this.mail.sendMarketing(
        user.email,
        template.subject,
        template.content,
        user.name.split(' ')[0],
      );
    }

    template.lastSentAt = new Date();
    template.sentCount += recipients.length;
    await this.templates.save(template);

    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'marketing.send',
      detail: `"${template.name}" kampanyası ${recipients.length} kişiye gönderildi`,
    });

    return { ok: true, sent: recipients.length, test: false };
  }
}
