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
import * as bcrypt from 'bcrypt';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Address, Favorite, Product, User } from '../entities';
import { CurrentUser, JwtAuthGuard, type AuthUser } from '../auth/guards';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;
}

class AddressDto {
  @IsString()
  title: string;

  @IsString()
  fullName: string;

  @IsString()
  phone: string;

  @IsString()
  city: string;

  @IsString()
  district: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  zip?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Address) private readonly addresses: Repository<Address>,
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  @Patch('me')
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    const entity = await this.users.findOne({
      where: { id: user!.id },
      select: { id: true, email: true, name: true, phone: true, role: true, passwordHash: true },
    });
    if (!entity) throw new NotFoundException();

    if (dto.newPassword) {
      if (entity.passwordHash) {
        if (!dto.currentPassword || !(await bcrypt.compare(dto.currentPassword, entity.passwordHash))) {
          throw new BadRequestException('Mevcut şifre hatalı.');
        }
      }
      entity.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }
    if (dto.name) entity.name = dto.name.trim();
    if (dto.phone !== undefined) entity.phone = dto.phone;

    await this.users.save(entity);
    const { passwordHash: _ph, ...rest } = entity;
    return rest;
  }

  @Get('addresses')
  listAddresses(@CurrentUser() user: AuthUser) {
    return this.addresses.find({
      where: { userId: user!.id },
      order: { isDefault: 'DESC', title: 'ASC' },
    });
  }

  @Post('addresses')
  async createAddress(@CurrentUser() user: AuthUser, @Body() dto: AddressDto) {
    if (dto.isDefault) {
      await this.addresses.update({ userId: user!.id }, { isDefault: false });
    }
    const address = this.addresses.create({ ...dto, userId: user!.id });
    return this.addresses.save(address);
  }

  @Patch('addresses/:id')
  async updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddressDto,
  ) {
    const address = await this.addresses.findOne({ where: { id, userId: user!.id } });
    if (!address) throw new NotFoundException('Adres bulunamadı.');
    if (dto.isDefault) {
      await this.addresses.update({ userId: user!.id }, { isDefault: false });
    }
    Object.assign(address, dto);
    return this.addresses.save(address);
  }

  @Delete('addresses/:id')
  async deleteAddress(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.addresses.delete({ id, userId: user!.id });
    if (!result.affected) throw new NotFoundException('Adres bulunamadı.');
    return { ok: true };
  }

  @Get('favorites')
  async listFavorites(@CurrentUser() user: AuthUser) {
    const favorites = await this.favorites.find({
      where: { userId: user!.id },
      relations: { product: { images: true, category: true } },
      order: { createdAt: 'DESC' },
    });
    return favorites.filter((f) => f.product).map((f) => f.product);
  }

  @Post('favorites/:productId')
  async toggleFavorite(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    const existing = await this.favorites.findOne({ where: { userId: user!.id, productId } });
    if (existing) {
      await this.favorites.remove(existing);
      return { favorited: false };
    }
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Ürün bulunamadı.');
    await this.favorites.save(this.favorites.create({ userId: user!.id, productId }));
    return { favorited: true };
  }
}
