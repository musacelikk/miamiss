import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  Role,
  SenderType,
  SupportMessage,
  SupportTicket,
  TicketStatus,
} from '../entities';
import {
  CurrentUser,
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  Roles,
  RolesGuard,
  type AuthUser,
} from '../auth/guards';
import { MailService } from '../mail/mail.service';
import { LogsService } from '../logs/logs.service';

class CreateTicketDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  subject: string;

  @IsOptional()
  @IsString()
  orderNo?: string;

  @IsString()
  @MinLength(5)
  message: string;
}

class ReplyDto {
  @IsString()
  @MinLength(1)
  body: string;
}

class StatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;
}

@Controller()
export class SupportController {
  constructor(
    @InjectRepository(SupportTicket) private readonly tickets: Repository<SupportTicket>,
    @InjectRepository(SupportMessage) private readonly messages: Repository<SupportMessage>,
    private readonly mail: MailService,
    private readonly logs: LogsService,
  ) {}

  /* ================= Müşteri ================= */

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('support')
  @UseGuards(OptionalJwtAuthGuard)
  async create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthUser | null) {
    const ticket = await this.tickets.save(
      this.tickets.create({
        ticketNo: `DST-${randomBytes(3).toString('hex').toUpperCase()}`,
        userId: user?.id ?? null,
        email: dto.email.trim().toLowerCase(),
        name: dto.name.trim(),
        subject: dto.subject.trim(),
        orderNo: dto.orderNo?.trim() || null,
        status: TicketStatus.OPEN,
        messages: [
          this.messages.create({
            senderType: SenderType.CUSTOMER,
            senderName: dto.name.trim(),
            body: dto.message,
          }),
        ],
      }),
    );

    this.mail.supportNotifyAdmin({
      ticketNo: ticket.ticketNo,
      subject: ticket.subject,
      name: ticket.name,
      email: ticket.email,
      orderNo: ticket.orderNo,
      body: dto.message,
    });
    this.logs.record({
      userId: user?.id ?? null,
      email: ticket.email,
      actorType: user ? 'CUSTOMER' : 'GUEST',
      action: 'support.create',
      detail: `${ticket.ticketNo} — ${ticket.subject}`,
    });

    return { ticketNo: ticket.ticketNo, id: ticket.id };
  }

  @Get('support/mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.tickets.find({
      where: { userId: user!.id },
      relations: { messages: true },
      order: { updatedAt: 'DESC', messages: { createdAt: 'ASC' } },
    });
  }

  /** Misafir takibi: talep no + e-posta ile */
  @Get('support/track')
  async track(@Query('ticketNo') ticketNo: string, @Query('email') email: string) {
    const ticket = await this.tickets.findOne({
      where: {
        ticketNo: (ticketNo ?? '').trim().toUpperCase(),
        email: (email ?? '').trim().toLowerCase(),
      },
      relations: { messages: true },
      order: { messages: { createdAt: 'ASC' } },
    });
    if (!ticket) throw new NotFoundException('Destek talebi bulunamadı.');
    return ticket;
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('support/:id/messages')
  @UseGuards(JwtAuthGuard)
  async addMessage(
    @Param('id') id: string,
    @Body() dto: ReplyDto,
    @CurrentUser() user: AuthUser,
  ) {
    const ticket = await this.tickets.findOne({ where: { id, userId: user!.id } });
    if (!ticket) throw new NotFoundException('Destek talebi bulunamadı.');
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Bu talep kapatılmış. Yeni bir talep oluşturun.');
    }

    await this.messages.save(
      this.messages.create({
        ticketId: ticket.id,
        senderType: SenderType.CUSTOMER,
        senderName: ticket.name,
        body: dto.body,
      }),
    );
    await this.tickets.update(
      { id: ticket.id },
      { status: TicketStatus.OPEN, isReadByAdmin: false },
    );

    this.mail.supportNotifyAdmin({
      ticketNo: ticket.ticketNo,
      subject: ticket.subject,
      name: ticket.name,
      email: ticket.email,
      orderNo: ticket.orderNo,
      body: dto.body,
    });
    return { ok: true };
  }

  /* ================= Admin ================= */

  @Get('admin/support')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async list(@Query('status') status?: TicketStatus) {
    const [items, unread] = await Promise.all([
      this.tickets.find({
        where: status ? { status } : {},
        relations: { messages: true },
        order: { updatedAt: 'DESC', messages: { createdAt: 'ASC' } },
        take: 100,
      }),
      this.tickets.count({ where: { isReadByAdmin: false } }),
    ]);
    return { items, unread };
  }

  @Post('admin/support/:id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async reply(
    @Param('id') id: string,
    @Body() dto: ReplyDto,
    @CurrentUser() admin: AuthUser,
  ) {
    const ticket = await this.tickets.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Destek talebi bulunamadı.');

    await this.messages.save(
      this.messages.create({
        ticketId: ticket.id,
        senderType: SenderType.ADMIN,
        senderName: 'Miamisu Home',
        body: dto.body,
      }),
    );
    await this.tickets.update(
      { id: ticket.id },
      { status: TicketStatus.ANSWERED, isReadByAdmin: true },
    );

    this.mail.supportReplyToCustomer(ticket.email, ticket.ticketNo, ticket.subject, dto.body);
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'support.reply',
      detail: `${ticket.ticketNo} yanıtlandı`,
    });
    return { ok: true };
  }

  @Patch('admin/support/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async setStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    const result = await this.tickets.update({ id }, { status: dto.status });
    if (!result.affected) throw new NotFoundException('Destek talebi bulunamadı.');
    return { ok: true };
  }

  @Patch('admin/support/:id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async markRead(@Param('id') id: string) {
    await this.tickets.update({ id }, { isReadByAdmin: true });
    return { ok: true };
  }
}
