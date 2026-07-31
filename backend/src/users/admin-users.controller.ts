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
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Address, Favorite, Order, Review, Role, User } from '../entities';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type AuthUser } from '../auth/guards';
import { LogsService } from '../logs/logs.service';

class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Address) private readonly addresses: Repository<Address>,
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  async list(@Query('search') search?: string) {
    const qb = this.users
      .createQueryBuilder('u')
      .orderBy('u.createdAt', 'DESC')
      .take(200);
    if (search) {
      qb.where('(u.name ILIKE :s OR u.email ILIKE :s OR u.phone ILIKE :s)', {
        s: `%${search}%`,
      });
    }
    const users = await qb.getMany();

    // Siparis sayisi ve toplam harcama
    const stats: { userId: string; count: string; total: string | null }[] = users.length
      ? await this.orders
          .createQueryBuilder('o')
          .select('o.userId', 'userId')
          .addSelect('COUNT(*)', 'count')
          .addSelect(
            "SUM(CASE WHEN o.paymentStatus = 'PAID' AND o.status != 'CANCELLED' THEN o.grandTotal ELSE 0 END)",
            'total',
          )
          .where('o.userId IN (:...ids)', { ids: users.map((u) => u.id) })
          .groupBy('o.userId')
          .getRawMany()
      : [];
    const statMap = new Map(stats.map((s) => [s.userId, s]));

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      hasGoogle: !!u.googleId,
      createdAt: u.createdAt,
      orderCount: statMap.has(u.id) ? parseInt(statMap.get(u.id)!.count, 10) : 0,
      totalSpent: statMap.has(u.id) ? parseFloat(statMap.get(u.id)!.total ?? '0') : 0,
    }));
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Üye bulunamadı.');

    const [addresses, orders, favorites, reviews] = await Promise.all([
      this.addresses.find({ where: { userId: id }, order: { isDefault: 'DESC' } }),
      this.orders.find({
        where: { userId: id },
        relations: { items: true },
        order: { createdAt: 'DESC' },
        take: 100,
      }),
      this.favorites.find({
        where: { userId: id },
        relations: { product: { images: true } },
        order: { createdAt: 'DESC' },
      }),
      this.reviews.find({
        where: { userId: id },
        relations: { product: true },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const paidOrders = orders.filter(
      (o) => o.paymentStatus === 'PAID' && o.status !== 'CANCELLED',
    );
    const { passwordHash: _ph, ...rest } = user;
    return {
      ...rest,
      hasGoogle: !!user.googleId,
      addresses,
      orders,
      favorites: favorites.filter((f) => f.product).map((f) => f.product),
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        isApproved: r.isApproved,
        createdAt: r.createdAt,
        productName: r.product?.name ?? null,
      })),
      stats: {
        orderCount: orders.length,
        totalSpent: paidOrders.reduce((s, o) => s + o.grandTotal, 0),
        lastOrderAt: orders[0]?.createdAt ?? null,
      },
    };
  }

  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser() admin: AuthUser) {
    this.logsService.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'user.create',
      detail: `Üye eklendi: ${dto.email} (${dto.role ?? 'CUSTOMER'})`,
    });
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findOne({ where: { email } })) {
      throw new BadRequestException('Bu e-posta adresi zaten kayıtlı.');
    }
    const user = await this.users.save(
      this.users.create({
        email,
        name: dto.name.trim(),
        phone: dto.phone ?? null,
        role: dto.role ?? Role.CUSTOMER,
        passwordHash: await bcrypt.hash(dto.password, 10),
      }),
    );
    const { passwordHash: _ph, ...rest } = user;
    return rest;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() me: AuthUser) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Üye bulunamadı.');
    if (id === me!.id && dto.role === Role.CUSTOMER) {
      throw new BadRequestException('Kendi admin yetkinizi kaldıramazsınız.');
    }
    if (dto.name) user.name = dto.name.trim();
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.role) user.role = dto.role;
    if (dto.newPassword) user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.users.save(user);
    this.logsService.record({
      userId: me!.id,
      email: me!.email,
      actorType: 'ADMIN',
      action: 'user.update',
      detail: `Üye güncellendi: ${user.email}${dto.role ? ` (rol: ${dto.role})` : ''}${dto.newPassword ? ' (şifre sıfırlandı)' : ''}`,
    });
    const { passwordHash: _ph, ...rest } = user;
    return rest;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    if (id === me!.id) {
      throw new BadRequestException('Kendi hesabınızı silemezsiniz.');
    }
    const target = await this.users.findOne({ where: { id } });
    const result = await this.users.delete({ id });
    if (!result.affected) throw new NotFoundException('Üye bulunamadı.');
    this.logsService.record({
      userId: me!.id,
      email: me!.email,
      actorType: 'ADMIN',
      action: 'user.delete',
      detail: `Üye silindi: ${target?.email ?? id}`,
    });
    return { ok: true };
  }
}
