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
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Throttle } from '@nestjs/throttler';
import { createHmac } from 'crypto';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { MarketingOptout, MarketingTemplate, Role, User } from '../entities';
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

  /** Panelde secilen nihai alici listesi (uye olmayan elle eklenenler dahil) */
  @IsArray()
  @ArrayMaxSize(2000)
  @IsEmail({}, { each: true })
  recipientEmails: string[];

  /** Doluysa kampanya yalnizca bu adrese test olarak gider */
  @IsOptional()
  @IsEmail()
  testEmail?: string;
}

class UnsubscribeDto {
  @IsEmail()
  email: string;

  @IsString()
  token: string;
}

class ToggleSubscriberDto {
  @IsBoolean()
  acceptsMarketing: boolean;
}

/** E-postaya ozel, tahmin edilemez abonelikten cikma imzasi. */
export function unsubscribeToken(email: string): string {
  return createHmac('sha256', process.env.JWT_SECRET ?? 'dev-secret')
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

@Controller()
export class MarketingController {
  constructor(
    @InjectRepository(MarketingTemplate)
    private readonly templates: Repository<MarketingTemplate>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(MarketingOptout)
    private readonly optouts: Repository<MarketingOptout>,
    private readonly mail: MailService,
    private readonly logs: LogsService,
  ) {}

  /* ================= Müşteri (public) ================= */

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('marketing/unsubscribe')
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    const email = dto.email.trim().toLowerCase();
    if (dto.token !== unsubscribeToken(email)) {
      throw new BadRequestException('Bağlantı geçersiz.');
    }
    const user = await this.users.findOne({ where: { email } });
    if (user) {
      await this.users.update({ id: user.id }, { acceptsMarketing: false });
    }
    const existing = await this.optouts.findOne({ where: { email } });
    if (!existing) {
      await this.optouts.save(
        this.optouts.create({ email, userId: user?.id ?? null }),
      );
    }
    this.logs.record({
      userId: user?.id ?? null,
      email,
      actorType: user ? 'CUSTOMER' : 'GUEST',
      action: 'marketing.unsubscribe',
      detail: 'Pazarlama e-postalarından çıktı',
    });
    return { ok: true };
  }

  /* ================= Admin: şablonlar ================= */

  @Get('admin/marketing/templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  list() {
    return this.templates.find({ order: { updatedAt: 'DESC' } });
  }

  @Post('admin/marketing/templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: TemplateDto) {
    return this.templates.save(
      this.templates.create({ ...dto, subject: dto.subject ?? null }),
    );
  }

  @Patch('admin/marketing/templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: TemplateDto) {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Şablon bulunamadı.');
    Object.assign(template, dto, { subject: dto.subject ?? null });
    return this.templates.save(template);
  }

  @Delete('admin/marketing/templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    const result = await this.templates.delete({ id });
    if (!result.affected) throw new NotFoundException('Şablon bulunamadı.');
    return { ok: true };
  }

  /* ================= Admin: alıcılar / aboneler ================= */

  /** Gonderim panelinde on-secili gelecek izinli alici listesi. */
  @Get('admin/marketing/recipients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async recipients(@Query('audience') audience?: 'ALL' | 'WITH_ORDERS') {
    const optoutEmails = (await this.optouts.find()).map((o) => o.email);
    const qb = this.users
      .createQueryBuilder('u')
      .where('u.role = :role', { role: Role.CUSTOMER })
      .andWhere('u.acceptsMarketing = true')
      .orderBy('u.name', 'ASC');
    if (audience === 'WITH_ORDERS') {
      qb.andWhere('EXISTS (SELECT 1 FROM orders o WHERE o."userId" = u.id)');
    }
    const users = await qb.getMany();
    return users
      .filter((u) => !optoutEmails.includes(u.email))
      .map((u) => ({ id: u.id, name: u.name, email: u.email }));
  }

  /** Kim izinli, kim cikmis — tam gorunum. */
  @Get('admin/marketing/subscribers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async subscribers() {
    const [customers, optouts] = await Promise.all([
      this.users.find({
        where: { role: Role.CUSTOMER },
        order: { createdAt: 'DESC' },
        take: 500,
      }),
      this.optouts.find({ order: { createdAt: 'DESC' } }),
    ]);
    const optoutMap = new Map(optouts.map((o) => [o.email, o]));
    const members = customers.map((u) => {
      const optout = optoutMap.get(u.email);
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        subscribed: u.acceptsMarketing && !optout,
        unsubscribedAt: optout?.createdAt ?? null,
        memberSince: u.createdAt,
      };
    });
    // Uye olmayan (elle eklenmis) adreslerin cikislari
    const memberEmails = new Set(customers.map((u) => u.email));
    const external = optouts
      .filter((o) => !memberEmails.has(o.email))
      .map((o) => ({ id: o.id, email: o.email, unsubscribedAt: o.createdAt }));
    return {
      members,
      external,
      counts: {
        subscribed: members.filter((m) => m.subscribed).length,
        unsubscribed: members.filter((m) => !m.subscribed).length + external.length,
      },
    };
  }

  /** Uyenin pazarlama iznini admin degistirir (yeniden abone etme dahil). */
  @Patch('admin/marketing/subscribers/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async toggleSubscriber(
    @Param('userId') userId: string,
    @Body() dto: ToggleSubscriberDto,
    @CurrentUser() admin: AuthUser,
  ) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Üye bulunamadı.');
    await this.users.update({ id: userId }, { acceptsMarketing: dto.acceptsMarketing });
    if (dto.acceptsMarketing) {
      await this.optouts.delete({ email: user.email });
    } else if (!(await this.optouts.findOne({ where: { email: user.email } }))) {
      await this.optouts.save(this.optouts.create({ email: user.email, userId }));
    }
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'marketing.subscriber',
      detail: `${user.email} → ${dto.acceptsMarketing ? 'abone' : 'çıkarıldı'}`,
    });
    return { ok: true };
  }

  /** Uye olmayan bir cikis kaydini kaldirir (adres tekrar gonderilebilir olur). */
  @Delete('admin/marketing/optouts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async removeOptout(@Param('id') id: string) {
    const result = await this.optouts.delete({ id });
    if (!result.affected) throw new NotFoundException('Kayıt bulunamadı.');
    return { ok: true };
  }

  /* ================= Admin: gönderim ================= */

  @Post('admin/marketing/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async send(@Body() dto: SendDto, @CurrentUser() admin: AuthUser) {
    const template = await this.templates.findOne({ where: { id: dto.templateId } });
    if (!template) throw new NotFoundException('Şablon bulunamadı.');
    if (template.type === 'SMS') {
      throw new BadRequestException(
        'SMS gönderimi Netgsm entegrasyonu tamamlanınca aktif olacak.',
      );
    }
    if (!template.subject?.trim()) {
      throw new BadRequestException('E-posta şablonunda konu (subject) zorunludur.');
    }

    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const linkFor = (email: string) =>
      `${frontend}/abonelik?email=${encodeURIComponent(email)}&token=${unsubscribeToken(email)}`;

    if (dto.testEmail) {
      this.mail.sendMarketing(
        dto.testEmail,
        template.subject,
        template.content,
        'Test Kullanıcı',
        linkFor(dto.testEmail),
      );
      return { ok: true, sent: 1, skipped: 0, test: true };
    }

    const emails = [...new Set(dto.recipientEmails.map((e) => e.trim().toLowerCase()))];
    if (!emails.length) {
      throw new BadRequestException('En az bir alıcı seçmelisiniz.');
    }

    // Cikmis adresleri guvenlik icin sunucu tarafinda da ele
    const optedOut = new Set(
      (await this.optouts.find({ where: { email: In(emails) } })).map((o) => o.email),
    );
    const knownUsers = await this.users.find({ where: { email: In(emails) } });
    const nameMap = new Map(knownUsers.map((u) => [u.email, u.name.split(' ')[0]]));
    for (const u of knownUsers) {
      if (!u.acceptsMarketing) optedOut.add(u.email);
    }

    let sent = 0;
    for (const email of emails) {
      if (optedOut.has(email)) continue;
      this.mail.sendMarketing(
        email,
        template.subject,
        template.content,
        nameMap.get(email) ?? 'Değerli Müşterimiz',
        linkFor(email),
      );
      sent++;
    }

    template.lastSentAt = new Date();
    template.sentCount += sent;
    await this.templates.save(template);

    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'marketing.send',
      detail: `"${template.name}" kampanyası ${sent} kişiye gönderildi (${emails.length - sent} izinsiz atlandı)`,
    });

    return { ok: true, sent, skipped: emails.length - sent, test: false };
  }
}
