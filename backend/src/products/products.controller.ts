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
import { Repository } from 'typeorm';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { Review } from '../entities';
import { ProductsService } from './products.service';
import { CurrentUser, JwtAuthGuard, type AuthUser } from '../auth/guards';

class CreateReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MinLength(3)
  comment: string;
}

@Controller()
export class ProductsController {
  constructor(
    private readonly service: ProductsService,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
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
    const product = await this.service.bySlug(slug);
    const existing = await this.reviews.findOne({
      where: { productId: product.id, userId: user!.id },
    });
    if (existing) throw new BadRequestException('Bu ürüne zaten yorum yaptınız.');
    await this.reviews.save(
      this.reviews.create({
        productId: product.id,
        userId: user!.id,
        rating: dto.rating,
        comment: dto.comment,
      }),
    );
    return { ok: true, message: 'Yorumunuz onaya gönderildi.' };
  }

  @Get('categories')
  categories() {
    return this.service.listCategories();
  }
}
