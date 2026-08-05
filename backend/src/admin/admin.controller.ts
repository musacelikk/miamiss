import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, LessThanOrEqual, MoreThan, Repository, type FindOptionsWhere } from 'typeorm';
import {
  ContactMessage,
  Coupon,
  Favorite,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  Review,
  Role,
  User,
} from '../entities';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(ContactMessage) private readonly messages: Repository<ContactMessage>,
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
  ) {}

  /** En cok favorilenen urunler: sayim + urun detayi (gorselli) */
  private async topFavorited(limit: number) {
    const rows: { productId: string; count: string }[] = await this.favorites
      .createQueryBuilder('f')
      .select('f.productId', 'productId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('f.productId')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
    if (!rows.length) return [];
    const products = await this.products.find({
      where: { id: In(rows.map((r) => r.productId)) },
      relations: { images: true },
    });
    return rows.flatMap((r) => {
      const product = products.find((p) => p.id === r.productId);
      return product ? [{ product, count: parseInt(r.count, 10) }] : [];
    });
  }

  @Get('stats')
  async stats() {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      totalOrders,
      pendingOrders,
      monthOrders,
      totalProducts,
      lowStock,
      totalCustomers,
      pendingReviews,
      unreadMessages,
      recentOrders,
    ] = await Promise.all([
      this.orders.count(),
      this.orders.count({ where: { status: OrderStatus.PENDING } }),
      this.orders.count({ where: { createdAt: MoreThan(monthAgo) } }),
      this.products.count(),
      this.products.find({
        where: { stock: LessThanOrEqual(3), isActive: true },
        order: { stock: 'ASC' },
        take: 10,
      }),
      this.users.count({ where: { role: Role.CUSTOMER } }),
      this.reviews.count({ where: { isApproved: false } }),
      this.messages.count({ where: { isRead: false } }),
      this.orders.find({ order: { createdAt: 'DESC' }, take: 8, relations: { items: true } }),
    ]);

    const revenueRow: { total: string | null } | undefined = await this.orders
      .createQueryBuilder('o')
      .select('SUM(o.grandTotal)', 'total')
      .where('o.paymentStatus = :ps', { ps: PaymentStatus.PAID })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getRawOne();

    const monthRevenueRow: { total: string | null } | undefined = await this.orders
      .createQueryBuilder('o')
      .select('SUM(o.grandTotal)', 'total')
      .where('o.paymentStatus = :ps', { ps: PaymentStatus.PAID })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('o.createdAt > :monthAgo', { monthAgo })
      .getRawOne();

    // Gunluk seri: son 30 gunun sipariş adedi ve odenen cirosu
    const dailyRows: { day: string; orders: string; revenue: string | null }[] =
      await this.orders
        .createQueryBuilder('o')
        .select("TO_CHAR(DATE_TRUNC('day', o.createdAt), 'YYYY-MM-DD')", 'day')
        .addSelect('COUNT(*)', 'orders')
        .addSelect(
          "SUM(CASE WHEN o.paymentStatus = 'PAID' AND o.status != 'CANCELLED' THEN o.grandTotal ELSE 0 END)",
          'revenue',
        )
        .where('o.createdAt > :monthAgo', { monthAgo })
        .groupBy('day')
        .orderBy('day', 'ASC')
        .getRawMany();
    const dailyMap = new Map(dailyRows.map((r) => [r.day, r]));
    const dailySeries: { date: string; orders: number; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = dailyMap.get(key);
      dailySeries.push({
        date: key,
        orders: row ? parseInt(row.orders, 10) : 0,
        revenue: row ? parseFloat(row.revenue ?? '0') : 0,
      });
    }

    // En cok tiklanan urunler
    const topViewed = await this.products.find({
      order: { viewCount: 'DESC' },
      take: 8,
      relations: { images: true },
    });

    // En cok favorilenen urunler
    const topFavorited = await this.topFavorited(8);

    return {
      totalOrders,
      pendingOrders,
      monthOrders,
      totalProducts,
      totalCustomers,
      pendingReviews,
      unreadMessages,
      revenue: parseFloat(revenueRow?.total ?? '0') || 0,
      monthRevenue: parseFloat(monthRevenueRow?.total ?? '0') || 0,
      lowStock,
      recentOrders,
      dailySeries,
      topViewed,
      topFavorited,
    };
  }

  @Get('reports')
  async reports() {
    const yearAgo = new Date();
    yearAgo.setMonth(yearAgo.getMonth() - 11);
    yearAgo.setDate(1);
    yearAgo.setHours(0, 0, 0, 0);

    // Aylik satis (12 ay): tum siparisler + odenen ciro
    const monthlyRows: { month: string; orders: string; revenue: string | null }[] =
      await this.orders
        .createQueryBuilder('o')
        .select("TO_CHAR(DATE_TRUNC('month', o.createdAt), 'YYYY-MM')", 'month')
        .addSelect('COUNT(*)', 'orders')
        .addSelect(
          "SUM(CASE WHEN o.paymentStatus = 'PAID' AND o.status != 'CANCELLED' THEN o.grandTotal ELSE 0 END)",
          'revenue',
        )
        .where('o.createdAt >= :yearAgo', { yearAgo })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();
    const monthlyMap = new Map(monthlyRows.map((r) => [r.month, r]));
    const monthly: { month: string; orders: number; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const row = monthlyMap.get(key);
      monthly.push({
        month: key,
        orders: row ? parseInt(row.orders, 10) : 0,
        revenue: row ? parseFloat(row.revenue ?? '0') : 0,
      });
    }

    // En cok satan urunler (odenen, iptal olmayan)
    const topProducts: {
      name: string;
      quantity: string;
      revenue: string;
    }[] = await this.orders.manager
      .createQueryBuilder()
      .select('i.name', 'name')
      .addSelect('SUM(i.quantity)', 'quantity')
      .addSelect('SUM(i.unitPrice * i.quantity)', 'revenue')
      .from('order_items', 'i')
      .innerJoin('orders', 'o', 'o.id = i."orderId"')
      .where("o.paymentStatus = 'PAID' AND o.status != 'CANCELLED'")
      .andWhere("i.itemType = 'PRODUCT'")
      .groupBy('i.name')
      .orderBy('quantity', 'DESC')
      .limit(10)
      .getRawMany();

    // Kategori kirilimi
    const categoryBreakdown: { category: string; quantity: string; revenue: string }[] =
      await this.orders.manager
        .createQueryBuilder()
        .select("COALESCE(c.name, 'Diğer')", 'category')
        .addSelect('SUM(i.quantity)', 'quantity')
        .addSelect('SUM(i.unitPrice * i.quantity)', 'revenue')
        .from('order_items', 'i')
        .innerJoin('orders', 'o', 'o.id = i."orderId"')
        .leftJoin('products', 'p', 'p.id = i."productId"')
        .leftJoin('categories', 'c', 'c.id = p."categoryId"')
        .where("o.paymentStatus = 'PAID' AND o.status != 'CANCELLED'")
        .andWhere("i.itemType = 'PRODUCT'")
        .groupBy('c.name')
        .orderBy('revenue', 'DESC')
        .getRawMany();

    // Odeme yontemi kirilimi (tum siparisler)
    const paymentBreakdown: { method: string; count: string; revenue: string | null }[] =
      await this.orders
        .createQueryBuilder('o')
        .select('o.paymentMethod', 'method')
        .addSelect('COUNT(*)', 'count')
        .addSelect(
          "SUM(CASE WHEN o.paymentStatus = 'PAID' AND o.status != 'CANCELLED' THEN o.grandTotal ELSE 0 END)",
          'revenue',
        )
        .groupBy('o.paymentMethod')
        .getRawMany();

    // Kupon kullanimlari
    const couponUsage: { code: string; count: string; discount: string }[] =
      await this.orders
        .createQueryBuilder('o')
        .select('o.couponCode', 'code')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(o.discountTotal)', 'discount')
        .where('o.couponCode IS NOT NULL')
        .andWhere("o.status != 'CANCELLED'")
        .groupBy('o.couponCode')
        .orderBy('count', 'DESC')
        .limit(15)
        .getRawMany();

    // Aylik yeni uye
    const customersRows: { month: string; count: string }[] = await this.users
      .createQueryBuilder('u')
      .select("TO_CHAR(DATE_TRUNC('month', u.createdAt), 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .where('u.createdAt >= :yearAgo', { yearAgo })
      .andWhere('u.role = :role', { role: Role.CUSTOMER })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();
    const customerMap = new Map(customersRows.map((r) => [r.month, r]));
    const newCustomers = monthly.map((m) => ({
      month: m.month,
      count: customerMap.has(m.month)
        ? parseInt(customerMap.get(m.month)!.count, 10)
        : 0,
    }));

    // En cok favorilenen urunler (rapor tablosu icin)
    const topFavorited = (await this.topFavorited(15)).map((r) => ({
      name: r.product.name,
      slug: r.product.slug,
      count: r.count,
      stock: r.product.stock,
      price: r.product.price,
    }));

    return {
      monthly,
      topFavorited,
      topProducts: topProducts.map((r) => ({
        name: r.name,
        quantity: parseInt(r.quantity, 10),
        revenue: parseFloat(r.revenue),
      })),
      categoryBreakdown: categoryBreakdown.map((r) => ({
        category: r.category,
        quantity: parseInt(r.quantity, 10),
        revenue: parseFloat(r.revenue),
      })),
      paymentBreakdown: paymentBreakdown.map((r) => ({
        method: r.method,
        count: parseInt(r.count, 10),
        revenue: parseFloat(r.revenue ?? '0'),
      })),
      couponUsage: couponUsage.map((r) => ({
        code: r.code,
        count: parseInt(r.count, 10),
        discount: parseFloat(r.discount),
      })),
      newCustomers,
    };
  }

  /**
   * PDF/Excel disa aktarma icin ham veri: tarih araligina gore filtrelenmis
   * duz satirlar doner; kolon secimi ve dosya uretimi frontend'de yapilir.
   */
  @Get('export/:type')
  async export(
    @Param('type') type: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const CAP = 5000;
    const fromDate = from ? new Date(`${from}T00:00:00`) : null;
    const toDate = to ? new Date(`${to}T23:59:59.999`) : null;
    const dateWhere = <T extends { createdAt?: unknown }>():
      | FindOptionsWhere<T>
      | Record<string, never> => {
      if (fromDate && toDate) return { createdAt: Between(fromDate, toDate) } as FindOptionsWhere<T>;
      if (fromDate) return { createdAt: MoreThan(fromDate) } as FindOptionsWhere<T>;
      if (toDate) return { createdAt: LessThanOrEqual(toDate) } as FindOptionsWhere<T>;
      return {};
    };
    const dt = (d: Date | string | null | undefined) =>
      d
        ? new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
        : '—';
    const money = (v: number | null | undefined) =>
      v == null ? '—' : `${Number(v).toLocaleString('tr-TR')} ₺`;

    const STATUS_TR: Record<string, string> = {
      PENDING: 'Onay Bekliyor',
      CONFIRMED: 'Onaylandı',
      PREPARING: 'Hazırlanıyor',
      SHIPPED: 'Kargoda',
      DELIVERED: 'Teslim Edildi',
      CANCELLED: 'İptal',
    };
    const PAYMENT_TR: Record<string, string> = {
      BANK_TRANSFER: 'Havale/EFT',
      COD: 'Kapıda Ödeme',
      CARD: 'Kart',
      PAID: 'Ödendi',
      PENDING: 'Bekliyor',
      REFUNDED: 'İade Edildi',
    };

    switch (type) {
      case 'orders': {
        const orders = await this.orders.find({
          where: dateWhere<Order>(),
          order: { createdAt: 'DESC' },
          take: CAP,
        });
        return {
          rows: orders.map((o) => ({
            orderNo: o.orderNo,
            date: dt(o.createdAt),
            customer: o.shippingName,
            email: o.email,
            city: o.shippingCity,
            paymentMethod: PAYMENT_TR[o.paymentMethod] ?? o.paymentMethod,
            paymentStatus: PAYMENT_TR[o.paymentStatus] ?? o.paymentStatus,
            status: STATUS_TR[o.status] ?? o.status,
            subtotal: money(o.subtotal),
            discount: money(o.discountTotal),
            shipping: money(o.shippingTotal),
            grandTotal: money(o.grandTotal),
            coupon: o.couponCode ?? '—',
          })),
        };
      }
      case 'users': {
        const users = await this.users.find({
          where: { role: Role.CUSTOMER, ...dateWhere<User>() },
          order: { createdAt: 'DESC' },
          take: CAP,
        });
        return {
          rows: users.map((u) => ({
            name: u.name,
            email: u.email,
            phone: u.phone ?? '—',
            registeredAt: dt(u.createdAt),
            acceptsMarketing: u.acceptsMarketing ? 'Evet' : 'Hayır',
            via: u.googleId ? 'Google' : 'E-posta',
          })),
        };
      }
      case 'products': {
        const products = await this.products.find({
          relations: { category: true, variants: true },
          order: { name: 'ASC' },
          take: CAP,
        });
        return {
          rows: products.map((p) => ({
            name: p.name,
            sku: p.sku ?? '—',
            category: p.category?.name ?? '—',
            price: money(p.price),
            compareAtPrice: p.compareAtPrice != null ? money(p.compareAtPrice) : '—',
            stock: p.stock,
            variants: p.variants?.length
              ? p.variants.map((v) => `${v.name} (${v.stock})`).join(', ')
              : '—',
            status: p.isActive ? 'Satışta' : 'Pasif',
            viewCount: p.viewCount ?? 0,
          })),
        };
      }
      case 'stock': {
        const products = await this.products.find({
          relations: { category: true, variants: true },
          order: { stock: 'ASC' },
          take: CAP,
        });
        return {
          rows: products.map((p) => ({
            name: p.name,
            sku: p.sku ?? '—',
            category: p.category?.name ?? '—',
            stock: p.stock,
            variants: p.variants?.length
              ? p.variants.map((v) => `${v.name}: ${v.stock}`).join(', ')
              : '—',
            status:
              p.stock === 0 ? 'Tükendi' : p.stock <= 3 ? 'Kritik' : 'Yeterli',
            isActive: p.isActive ? 'Satışta' : 'Pasif',
          })),
        };
      }
      case 'reviews': {
        const reviews = await this.reviews.find({
          where: dateWhere<Review>(),
          relations: { user: true, product: true },
          order: { createdAt: 'DESC' },
          take: CAP,
        });
        return {
          rows: reviews.map((r) => ({
            product: r.product?.name ?? '—',
            user: r.displayName ?? r.user?.name ?? '—',
            rating: r.rating ?? '—',
            comment: r.comment,
            type: r.parentId ? 'Yanıt' : 'Yorum',
            status: r.isApproved ? 'Yayında' : 'Kaldırıldı',
            date: dt(r.createdAt),
          })),
        };
      }
      case 'coupons': {
        const coupons = await this.coupons.find({
          where: dateWhere<Coupon>(),
          order: { createdAt: 'DESC' },
          take: CAP,
        });
        return {
          rows: coupons.map((c) => ({
            code: c.code,
            type: c.type === 'PERCENT' ? `%${c.value}` : money(c.value),
            usedCount: c.usedCount,
            maxUses: c.maxUses ?? 'Sınırsız',
            minOrderTotal: c.minOrderTotal != null ? money(c.minOrderTotal) : '—',
            expiresAt: c.expiresAt ? dt(c.expiresAt) : 'Süresiz',
            source: c.source === 'PUZZLE' ? 'Bulmaca' : 'Manuel',
            status: c.isActive ? 'Aktif' : 'Pasif',
          })),
        };
      }
      case 'favorites': {
        const top = await this.topFavorited(CAP);
        return {
          rows: top.map((f, i) => ({
            rank: i + 1,
            name: f.product.name,
            sku: f.product.sku ?? '—',
            count: f.count,
            price: money(f.product.price),
            stock: f.product.stock,
          })),
        };
      }
      case 'messages': {
        const messages = await this.messages.find({
          where: dateWhere<ContactMessage>(),
          order: { createdAt: 'DESC' },
          take: CAP,
        });
        return {
          rows: messages.map((m) => ({
            name: m.name,
            email: m.email,
            subject: m.subject ?? '—',
            message: m.message,
            status: m.isRead ? 'Okundu' : 'Yeni',
            date: dt(m.createdAt),
          })),
        };
      }
      default:
        throw new BadRequestException('Bilinmeyen rapor türü.');
    }
  }
}
