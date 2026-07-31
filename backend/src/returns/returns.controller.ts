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
import { In, Repository } from 'typeorm';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Order, OrderStatus, ReturnRequest, ReturnStatus, Role } from '../entities';
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

export const RETURN_REASONS = [
  'Ürün hasarlı ulaştı',
  'Yanlış ürün geldi',
  'Beklediğim gibi değil',
  'Vazgeçtim',
  'Diğer',
] as const;

class CreateReturnDto {
  @IsString()
  orderNo: string;

  @IsEmail()
  email: string;

  @IsIn(RETURN_REASONS as unknown as string[])
  reason: string;

  @IsString()
  @MinLength(10, { message: 'Lütfen iade sebebinizi biraz daha detaylandırın.' })
  description: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  imageUrls?: string[];
}

class DecideDto {
  @IsEnum(ReturnStatus)
  status: ReturnStatus;

  @IsOptional()
  @IsString()
  adminNote?: string;
}

@Controller()
export class ReturnsController {
  constructor(
    @InjectRepository(ReturnRequest) private readonly returns: Repository<ReturnRequest>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly mail: MailService,
    private readonly logs: LogsService,
  ) {}

  /* ================= Müşteri ================= */

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('returns')
  @UseGuards(OptionalJwtAuthGuard)
  async create(@Body() dto: CreateReturnDto, @CurrentUser() user: AuthUser | null) {
    const order = await this.orders.findOne({
      where: {
        orderNo: dto.orderNo.trim().toUpperCase(),
        email: dto.email.trim().toLowerCase(),
      },
    });
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'İade talebi yalnızca teslim edilmiş siparişler için oluşturulabilir.',
      );
    }
    const existing = await this.returns.findOne({
      where: {
        orderId: order.id,
        status: In([ReturnStatus.PENDING, ReturnStatus.APPROVED]),
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Bu sipariş için zaten açık bir iade talebiniz var (${existing.returnNo}).`,
      );
    }

    const request = await this.returns.save(
      this.returns.create({
        returnNo: `IAD-${randomBytes(3).toString('hex').toUpperCase()}`,
        orderId: order.id,
        orderNo: order.orderNo,
        email: order.email,
        userId: user?.id ?? null,
        reason: dto.reason,
        description: dto.description,
        images: dto.imageUrls ?? [],
      }),
    );

    this.mail.returnNotifyAdmin({
      returnNo: request.returnNo,
      orderNo: order.orderNo,
      email: order.email,
      reason: dto.reason,
      description: dto.description,
      imageCount: request.images.length,
    });
    this.logs.record({
      userId: user?.id ?? null,
      email: order.email,
      actorType: user ? 'CUSTOMER' : 'GUEST',
      action: 'return.create',
      detail: `${request.returnNo} — ${order.orderNo} (${dto.reason})`,
    });

    return { ok: true, returnNo: request.returnNo, status: request.status };
  }

  /** Siparisin iade taleplerini getirir (siparis no + e-posta bilen sahibidir). */
  @Get('returns/track')
  track(@Query('orderNo') orderNo: string, @Query('email') email: string) {
    return this.returns.find({
      where: {
        orderNo: (orderNo ?? '').trim().toUpperCase(),
        email: (email ?? '').trim().toLowerCase(),
      },
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        returnNo: true,
        reason: true,
        status: true,
        adminNote: true,
        createdAt: true,
      },
    });
  }

  /* ================= Admin ================= */

  @Get('admin/returns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async list(@Query('status') status?: ReturnStatus) {
    const [items, pending] = await Promise.all([
      this.returns.find({
        where: status ? { status } : {},
        order: { createdAt: 'DESC' },
        take: 100,
      }),
      this.returns.count({ where: { status: ReturnStatus.PENDING } }),
    ]);
    return { items, pending };
  }

  @Patch('admin/returns/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async decide(
    @Param('id') id: string,
    @Body() dto: DecideDto,
    @CurrentUser() admin: AuthUser,
  ) {
    const request = await this.returns.findOne({ where: { id } });
    if (!request) throw new NotFoundException('İade talebi bulunamadı.');

    request.status = dto.status;
    if (dto.adminNote !== undefined) request.adminNote = dto.adminNote || null;
    await this.returns.save(request);

    this.mail.returnDecisionToCustomer(
      request.email,
      request.returnNo,
      request.orderNo,
      dto.status,
      request.adminNote,
    );
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'return.decide',
      detail: `${request.returnNo} → ${dto.status}`,
    });
    return request;
  }
}
