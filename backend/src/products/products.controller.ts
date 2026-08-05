import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { Review } from '../entities';
import { ProductsService } from './products.service';
import { CurrentUser, JwtAuthGuard, type AuthUser } from '../auth/guards';
import { MailService } from '../mail/mail.service';

class CreateReviewDto {
  /** Yanitlarda puan gonderilmez */
  @ValidateIf((o: CreateReviewDto) => !o.parentId)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsString()
  @MinLength(3)
  comment: string;

  /** Doluysa bu bir yanittir: ayni urundeki bir yoruma baglanir */
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

@Controller()
export class ProductsController {
  constructor(
    private readonly service: ProductsService,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    private readonly mail: MailService,
  ) {}

  @Get('products')
  list(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: 'newest' | 'price-asc' | 'price-desc' | 'name',
    @Query('featured') featured?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      category,
      search,
      sort,
      featured: featured === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('products/:slug')
  bySlug(@Param('slug') slug: string, @Query('track') track?: string) {
    return this.service.bySlug(slug, track !== '0');
  }

  @Post('products/:slug/reviews')
  @UseGuards(JwtAuthGuard)
  async createReview(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Body() dto: CreateReviewDto,
  ) {
    const product = await this.service.bySlug(slug, false);

    // Yanit: ayni urundeki bir yoruma baglanir; ic ice tek seviye tutulur
    if (dto.parentId) {
      const parent = await this.reviews.findOne({
        where: { id: dto.parentId, productId: product.id, isApproved: true },
      });
      if (!parent) throw new BadRequestException('Yanıtlanacak yorum bulunamadı.');
      await this.reviews.save(
        this.reviews.create({
          productId: product.id,
          userId: user!.id,
          parentId: parent.parentId ?? parent.id,
          rating: null,
          comment: dto.comment,
          isApproved: true,
        }),
      );
      this.mail.reviewCreatedAdmin({
        productName: product.name,
        userName: user!.email,
        rating: null,
        comment: dto.comment,
        isReply: true,
      });
      return { ok: true, message: 'Yanıtınız yayınlandı.' };
    }

    const existing = await this.reviews.findOne({
      where: { productId: product.id, userId: user!.id, parentId: IsNull() },
    });
    if (existing) {
      throw new BadRequestException('Bu ürüne zaten yorum yaptınız.');
    }
    await this.reviews.save(
      this.reviews.create({
        productId: product.id,
        userId: user!.id,
        rating: dto.rating,
        comment: dto.comment,
        isApproved: true,
      }),
    );
    this.mail.reviewCreatedAdmin({
      productName: product.name,
      userName: user!.email,
      rating: dto.rating ?? null,
      comment: dto.comment,
      isReply: false,
    });
    return { ok: true, message: 'Yorumunuz yayınlandı. Teşekkürler!' };
  }

  @Get('categories')
  categories() {
    return this.service.listCategories();
  }
}
