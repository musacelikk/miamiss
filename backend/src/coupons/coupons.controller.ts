import {
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
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Coupon, CouponType, Role } from '../entities';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type AuthUser } from '../auth/guards';
import { CouponsService } from './coupons.service';
import { LogsService } from '../logs/logs.service';

class ValidateCouponDto {
  @IsString()
  code: string;

  @Type(() => Number)
  @IsNumber()
  subtotal: number;
}

class CouponDto {
  @IsString()
  @MinLength(3)
  code: string;

  @IsEnum(CouponType)
  type: CouponType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minOrderTotal?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxUses?: number | null;

  @IsOptional()
  expiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller()
export class CouponsController {
  constructor(
    private readonly service: CouponsService,
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    private readonly logs: LogsService,
  ) {}

  @Post('coupons/validate')
  async validate(@Body() dto: ValidateCouponDto) {
    const { coupon, discount } = await this.service.validate(dto.code, dto.subtotal);
    return { code: coupon.code, type: coupon.type, value: coupon.value, discount };
  }

  @Get('admin/coupons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  list() {
    return this.coupons.find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  @Post('admin/coupons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CouponDto, @CurrentUser() admin: AuthUser) {
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'coupon.create',
      detail: `Kupon eklendi: ${dto.code.toUpperCase()} (${dto.type === 'PERCENT' ? `%${dto.value}` : `${dto.value} TL`})`,
    });
    return this.coupons.save(
      this.coupons.create({
        ...dto,
        code: dto.code.trim().toUpperCase(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      }),
    );
  }

  @Patch('admin/coupons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: CouponDto) {
    const coupon = await this.coupons.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Kupon bulunamadı.');
    Object.assign(coupon, {
      ...dto,
      code: dto.code.trim().toUpperCase(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    return this.coupons.save(coupon);
  }

  @Delete('admin/coupons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() admin: AuthUser) {
    const coupon = await this.coupons.findOne({ where: { id } });
    const result = await this.coupons.delete({ id });
    if (!result.affected) throw new NotFoundException('Kupon bulunamadı.');
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'coupon.delete',
      detail: `Kupon silindi: ${coupon?.code ?? id}`,
    });
    return { ok: true };
  }
}
