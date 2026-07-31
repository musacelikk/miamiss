import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEmail, IsString } from 'class-validator';
import { Product, StockAlert } from '../entities';

class CreateStockAlertDto {
  @IsString()
  productId: string;

  @IsEmail()
  email: string;
}

@Controller('stock-alerts')
export class StockAlertsController {
  constructor(
    @InjectRepository(StockAlert) private readonly alerts: Repository<StockAlert>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  @Post()
  async create(@Body() dto: CreateStockAlertDto) {
    const product = await this.products.findOne({ where: { id: dto.productId } });
    if (!product) throw new BadRequestException('Ürün bulunamadı.');
    if (product.stock > 0) {
      throw new BadRequestException('Bu ürün zaten stokta.');
    }
    const email = dto.email.trim().toLowerCase();
    const existing = await this.alerts.findOne({
      where: { productId: dto.productId, email },
    });
    if (existing) {
      // Ayni kisi tekrar kaydolursa bildirimi sifirla
      existing.isNotified = false;
      await this.alerts.save(existing);
    } else {
      await this.alerts.save(this.alerts.create({ productId: dto.productId, email }));
    }
    return { ok: true, message: 'Ürün stoğa girdiğinde size haber vereceğiz.' };
  }
}
