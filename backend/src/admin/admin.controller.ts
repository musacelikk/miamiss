import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import {
  ContactMessage,
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
  ) {}

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

    return {
      monthly,
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
}
