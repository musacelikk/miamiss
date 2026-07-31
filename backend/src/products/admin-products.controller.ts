import {
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
import {
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Category,
  Product,
  ProductImage,
  ProductVariant,
  Review,
  Role,
  StockAlert,
} from '../entities';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type AuthUser } from '../auth/guards';
import { ProductsService } from './products.service';
import { MailService } from '../mail/mail.service';
import { LogsService } from '../logs/logs.service';

export function slugify(text: string): string {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
  };
  return text
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

class VariantDto {
  @IsString()
  @MinLength(1)
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  compareAtPrice?: number | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsString()
  sku?: string;
}

class ProductDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  dimensions?: string;

  @IsOptional()
  @IsString()
  care?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  widthCm?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  heightCm?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depthCm?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weightKg?: number | null;

  @IsOptional()
  @IsString()
  features?: string;

  @IsOptional()
  @IsString()
  boxContents?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingFee?: number | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  compareAtPrice?: number | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsArray()
  imageUrls?: string[];

  /** Bos/verilmemis ise urun varyantsiz (tek fiyat + tek stok) satilir */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}

class CategoryDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  image?: string | null;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminProductsController {
  constructor(
    private readonly service: ProductsService,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductImage) private readonly images: Repository<ProductImage>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    @InjectRepository(StockAlert) private readonly stockAlerts: Repository<StockAlert>,
    private readonly mail: MailService,
    private readonly logs: LogsService,
  ) {}

  private logAdmin(admin: AuthUser, action: string, detail: string) {
    this.logs.record({
      userId: admin.id,
      email: admin.email,
      actorType: 'ADMIN',
      action,
      detail,
    });
  }

  @Get('products')
  list(@Query('search') search?: string, @Query('page') page?: string) {
    return this.service.list({
      search,
      includeInactive: true,
      page: page ? parseInt(page, 10) : 1,
      limit: 50,
    });
  }

  @Post('products')
  async create(@Body() dto: ProductDto, @CurrentUser() admin: AuthUser) {
    this.logAdmin(admin!, 'product.create', `Ürün eklendi: ${dto.name}`);
    const { imageUrls, variants, ...data } = dto;
    let slug = slugify(data.name);
    const clash = await this.products.findOne({ where: { slug } });
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const product = await this.products.save(
      this.products.create({
        ...data,
        slug,
        compareAtPrice: data.compareAtPrice ?? null,
        shippingFee: data.shippingFee ?? null,
      }),
    );
    if (imageUrls?.length) {
      await this.images.save(
        imageUrls.map((url, i) =>
          this.images.create({ productId: product.id, url, sortOrder: i, alt: product.name }),
        ),
      );
    }
    await this.syncVariants(product.id, variants);
    return this.products.findOne({
      where: { id: product.id },
      relations: { images: true, variants: true },
    });
  }

  /** Varyant listesini bastan yazar. undefined ise dokunmaz, bos dizi ise hepsini siler. */
  private async syncVariants(productId: string, variants?: VariantDto[]) {
    if (!variants) return;
    await this.variants.delete({ productId });
    if (!variants.length) return;
    await this.variants.save(
      variants.map((v, i) =>
        this.variants.create({
          productId,
          name: v.name.trim(),
          price: v.price,
          compareAtPrice: v.compareAtPrice ?? null,
          stock: v.stock,
          sku: v.sku?.trim() || null,
          sortOrder: i,
          isActive: true,
        }),
      ),
    );
  }

  @Patch('products/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: ProductDto,
    @CurrentUser() admin: AuthUser,
  ) {
    const product = await this.products.findOne({ where: { id }, relations: { images: true } });
    if (!product) throw new NotFoundException('Ürün bulunamadı.');
    this.logAdmin(admin!, 'product.update', `Ürün güncellendi: ${product.name}`);

    const wasOutOfStock = product.stock <= 0;
    const { imageUrls, variants, ...data } = dto;
    Object.assign(product, data, {
      compareAtPrice: data.compareAtPrice ?? null,
      shippingFee: data.shippingFee ?? null,
    });
    await this.products.save(product);

    // Stok 0'dan tekrar yukselirse "gelince haber ver" abonelerine mail at
    if (wasOutOfStock && product.stock > 0) {
      const pending = await this.stockAlerts.find({
        where: { productId: id, isNotified: false },
      });
      for (const alert of pending) {
        this.mail.stockReplenished(alert.email, product.name, product.slug);
      }
      if (pending.length) {
        await this.stockAlerts.update({ productId: id, isNotified: false }, { isNotified: true });
      }
    }

    if (imageUrls) {
      await this.images.delete({ productId: id });
      if (imageUrls.length) {
        await this.images.save(
          imageUrls.map((url, i) =>
            this.images.create({ productId: id, url, sortOrder: i, alt: product.name }),
          ),
        );
      }
    }
    await this.syncVariants(id, variants);
    return this.products.findOne({
      where: { id },
      relations: { images: true, variants: true },
    });
  }

  @Delete('products/:id')
  async remove(@Param('id') id: string, @CurrentUser() admin: AuthUser) {
    const product = await this.products.findOne({ where: { id } });
    const result = await this.products.delete({ id });
    if (!result.affected) throw new NotFoundException('Ürün bulunamadı.');
    this.logAdmin(admin!, 'product.delete', `Ürün silindi: ${product?.name ?? id}`);
    return { ok: true };
  }

  @Post('categories')
  createCategory(@Body() dto: CategoryDto) {
    return this.categories.save(
      this.categories.create({ ...dto, slug: slugify(dto.name) }),
    );
  }

  @Patch('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() dto: CategoryDto) {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Kategori bulunamadı.');
    Object.assign(category, dto, { slug: slugify(dto.name) });
    return this.categories.save(category);
  }

  @Delete('categories/:id')
  async removeCategory(@Param('id') id: string) {
    const result = await this.categories.delete({ id });
    if (!result.affected) throw new NotFoundException('Kategori bulunamadı.');
    return { ok: true };
  }

  @Post('reviews')
  async createManualReview(
    @Body()
    body: {
      productId: string;
      displayName: string;
      rating: number;
      comment: string;
      isApproved?: boolean;
    },
  ) {
    const product = await this.products.findOne({ where: { id: body.productId } });
    if (!product) throw new NotFoundException('Ürün bulunamadı.');
    const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5)));
    return this.reviews.save(
      this.reviews.create({
        productId: body.productId,
        userId: null,
        displayName: (body.displayName || 'Müşteri').trim(),
        rating,
        comment: body.comment,
        isApproved: body.isApproved ?? true,
      }),
    );
  }

  @Get('stock-alerts')
  listStockAlerts() {
    return this.stockAlerts.find({
      relations: { product: true },
      order: { isNotified: 'ASC', createdAt: 'DESC' },
      take: 300,
    });
  }

  @Delete('stock-alerts/:id')
  async removeStockAlert(@Param('id') id: string) {
    await this.stockAlerts.delete({ id });
    return { ok: true };
  }

  @Get('reviews')
  listReviews(@Query('pending') pending?: string) {
    return this.reviews.find({
      where: pending === 'true' ? { isApproved: false } : {},
      relations: { user: true, product: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  @Patch('reviews/:id')
  async moderateReview(@Param('id') id: string, @Body() body: { isApproved: boolean }) {
    const review = await this.reviews.findOne({ where: { id } });
    if (!review) throw new NotFoundException();
    review.isApproved = !!body.isApproved;
    return this.reviews.save(review);
  }

  @Delete('reviews/:id')
  async removeReview(@Param('id') id: string) {
    await this.reviews.delete({ id });
    return { ok: true };
  }
}
