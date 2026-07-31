import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, Product, ProductImage, Review } from '../entities';

export interface ProductQuery {
  category?: string;
  search?: string;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'name';
  featured?: boolean;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductImage) private readonly images: Repository<ProductImage>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
  ) {}

  async list(query: ProductQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 24));

    const qb = this.products
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('p.variants', 'variant')
      .leftJoinAndSelect('p.category', 'cat')
      .orderBy('p.createdAt', 'DESC')
      .addOrderBy('img.sortOrder', 'ASC');

    if (!query.includeInactive) qb.andWhere('p.isActive = true');
    if (query.category) qb.andWhere('cat.slug = :category', { category: query.category });
    if (query.featured) qb.andWhere('p.isFeatured = true');
    if (query.search) {
      qb.andWhere('(p.name ILIKE :s OR p.description ILIKE :s)', { s: `%${query.search}%` });
    }
    if (query.sort === 'price-asc') qb.orderBy('p.price', 'ASC');
    else if (query.sort === 'price-desc') qb.orderBy('p.price', 'DESC');
    else if (query.sort === 'name') qb.orderBy('p.name', 'ASC');

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const withRatings = await this.attachRatings(items);
    return { items: withRatings, total, page, pageCount: Math.ceil(total / limit) };
  }

  private async attachRatings(items: Product[]) {
    if (!items.length) return [] as (Product & { avgRating: number | null; reviewCount: number })[];
    const rows: { productId: string; avg: string; count: string }[] = await this.reviews
      .createQueryBuilder('r')
      .select('r.productId', 'productId')
      .addSelect('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.isApproved = true')
      .andWhere('r.productId IN (:...ids)', { ids: items.map((i) => i.id) })
      .groupBy('r.productId')
      .getRawMany();
    const map = new Map(rows.map((r) => [r.productId, r]));
    return items.map((p) => ({
      ...p,
      avgRating: map.has(p.id) ? Math.round(parseFloat(map.get(p.id)!.avg) * 10) / 10 : null,
      reviewCount: map.has(p.id) ? parseInt(map.get(p.id)!.count, 10) : 0,
    }));
  }

  async bySlug(slug: string, track = true) {
    const product = await this.products.findOne({
      where: { slug, isActive: true },
      relations: { images: true, category: true, variants: true },
      order: { images: { sortOrder: 'ASC' }, variants: { sortOrder: 'ASC' } },
    });
    if (!product) throw new NotFoundException('Ürün bulunamadı.');
    // Tiklanma sayaci (SSR metadata fetch'leri track=0 ile gelir, sayilmaz)
    if (track) {
      void this.products.increment({ id: product.id }, 'viewCount', 1).catch(() => undefined);
    }
    const reviews = await this.reviews.find({
      where: { productId: product.id, isApproved: true },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const [withRating] = await this.attachRatings([product]);
    const related = await this.products.find({
      where: { categoryId: product.categoryId ?? undefined, isActive: true },
      relations: { images: true, category: true },
      take: 5,
    });
    return {
      ...withRating,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        userName: r.displayName ?? r.user?.name?.split(' ')[0] ?? 'Müşteri',
      })),
      related: related.filter((p) => p.id !== product.id).slice(0, 4),
    };
  }

  listCategories() {
    return this.categories.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }
}
