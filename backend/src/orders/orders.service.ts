import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  Coupon,
  GiftCard,
  GiftCardStatus,
  Order,
  OrderItem,
  OrderItemType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductVariant,
} from '../entities';
import { ConfigService } from '@nestjs/config';
import { paytrConfigured } from '../payments/paytr.service';
import { CouponsService } from '../coupons/coupons.service';
import { GiftCardsService } from '../gift-cards/gift-cards.service';
import { SettingsService } from '../settings/settings.service';
import { MailService } from '../mail/mail.service';
import { ShippingService } from '../shipping/shipping.service';

export interface CreateOrderInput {
  userId?: string | null;
  email: string;
  items: { productId: string; quantity: number; variantId?: string | null }[];
  giftCardItems?: {
    amount: number;
    recipientName?: string;
    recipientEmail?: string;
    message?: string;
  }[];
  couponCode?: string;
  giftCardCode?: string;
  paymentMethod: PaymentMethod;
  shippingName: string;
  shippingPhone: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingAddress: string;
  shippingZip?: string;
  note?: string;
  invoiceType?: 'INDIVIDUAL' | 'CORPORATE';
  invoiceTckn?: string;
  invoiceCompanyName?: string;
  invoiceTaxNo?: string;
  invoiceTaxOffice?: string;
  invoiceAddress?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem) private readonly items: Repository<OrderItem>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(GiftCard) private readonly giftCardRepo: Repository<GiftCard>,
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    private readonly dataSource: DataSource,
    private readonly coupons: CouponsService,
    private readonly giftCards: GiftCardsService,
    private readonly settings: SettingsService,
    private readonly mail: MailService,
    private readonly configService: ConfigService,
    private readonly shipping: ShippingService,
  ) {}

  /** Durumu degistirir ve gecmise damgali kayit ekler. */
  async setStatus(orderId: string, status: OrderStatus): Promise<void> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order || order.status === status) return;
    order.status = status;
    order.statusHistory = [
      ...(order.statusHistory ?? []),
      { status, at: new Date().toISOString() },
    ];
    await this.orders.save(order);

    // Kapida odemede gonderi, siparis onaylandiginda olusturulur
    if (status === OrderStatus.CONFIRMED && order.paymentMethod === PaymentMethod.COD) {
      void this.shipping.autoCreateForOrder(order.id);
    }
  }

  private generateOrderNo(): string {
    return `MIA-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const hasProducts = input.items.length > 0;
    const hasGiftCards = (input.giftCardItems?.length ?? 0) > 0;
    if (!hasProducts && !hasGiftCards) {
      throw new BadRequestException('Sepetiniz boş.');
    }
    if (input.paymentMethod === PaymentMethod.CARD && !paytrConfigured(this.configService)) {
      throw new BadRequestException('Kredi kartı ile ödeme şu anda kullanılamıyor.');
    }
    for (const gc of input.giftCardItems ?? []) {
      if (gc.amount < 100 || gc.amount > 10000) {
        throw new BadRequestException('Hediye kartı tutarı 100–10.000 TL arasında olmalıdır.');
      }
    }

    // Urunleri DB fiyatlariyla dogrula (sepetten gelen fiyata guvenilmez)
    const productIds = input.items.map((i) => i.productId);
    const products = hasProducts
      ? await this.products.find({
          where: { id: In(productIds), isActive: true },
          relations: { images: true, variants: true, category: true },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException('Sepetteki bir ürün artık satışta değil.');
      const qty = Math.max(1, Math.floor(item.quantity));

      const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
      let variant = null as (typeof activeVariants)[number] | null;

      if (activeVariants.length) {
        if (!item.variantId) {
          throw new BadRequestException(`"${product.name}" için bir seçenek belirtmelisiniz.`);
        }
        variant = activeVariants.find((v) => v.id === item.variantId) ?? null;
        if (!variant) {
          throw new BadRequestException(
            `"${product.name}" için seçtiğiniz seçenek artık mevcut değil.`,
          );
        }
        if (variant.stock < qty) {
          throw new BadRequestException(
            `"${product.name} — ${variant.name}" için yeterli stok yok (kalan: ${variant.stock}).`,
          );
        }
      } else if (product.stock < qty) {
        throw new BadRequestException(
          `"${product.name}" için yeterli stok yok (kalan: ${product.stock}).`,
        );
      }

      const unitPrice = variant ? variant.price : product.price;
      subtotal += unitPrice * qty;
      orderItems.push(
        this.items.create({
          itemType: OrderItemType.PRODUCT,
          productId: product.id,
          variantId: variant?.id ?? null,
          variantName: variant?.name ?? null,
          name: product.name,
          imageUrl: variant?.image ?? product.images?.[0]?.url ?? null,
          categorySlug: product.category?.slug ?? null,
          unitPrice,
          quantity: qty,
        }),
      );
    }

    // Hediye karti satin alimlari (odeme onaylanana kadar PENDING)
    for (const gc of input.giftCardItems ?? []) {
      const card = await this.giftCards.createPending({
        amount: gc.amount,
        purchaserEmail: input.email,
        recipientName: gc.recipientName,
        recipientEmail: gc.recipientEmail,
        message: gc.message,
      });
      subtotal += gc.amount;
      orderItems.push(
        this.items.create({
          itemType: OrderItemType.GIFT_CARD,
          name: `Hediye Kartı ${gc.amount.toLocaleString('tr-TR')} TL`,
          unitPrice: gc.amount,
          quantity: 1,
          boughtGiftCardId: card.id,
        }),
      );
    }

    subtotal = round2(subtotal);

    // Kupon (hediye karti tutarina degil, urun toplamina uygulanir)
    const productSubtotal = round2(
      orderItems
        .filter((i) => i.itemType === OrderItemType.PRODUCT)
        .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    );
    let discountTotal = 0;
    let couponId: string | null = null;
    let couponCode: string | null = null;
    if (input.couponCode) {
      if (productSubtotal <= 0) {
        throw new BadRequestException('Kupon yalnızca ürün alışverişlerinde geçerlidir.');
      }
      const { coupon, discount } = await this.coupons.validate(input.couponCode, productSubtotal);
      discountTotal = discount;
      couponId = coupon.id;
      couponCode = coupon.code;
    }

    // Kargo: urune ozel ucret varsa sepetteki en yuksek olan gecerli, yoksa magaza geneli
    const store = await this.settings.get();
    const afterDiscount = round2(subtotal - discountTotal);
    let shippingTotal = 0;
    if (hasProducts) {
      const customFees = products
        .map((p) => p.shippingFee)
        .filter((f): f is number => f != null);
      const baseFee = customFees.length
        ? Math.max(store.shippingFee, ...customFees)
        : store.shippingFee;
      shippingTotal = afterDiscount >= store.freeShippingThreshold ? 0 : round2(baseFee);
    }
    if (input.paymentMethod === PaymentMethod.COD) {
      shippingTotal = round2(shippingTotal + store.codFee);
    }

    // Hediye karti ile odeme
    let giftCardTotal = 0;
    let giftCardId: string | null = null;
    const payable = round2(afterDiscount + shippingTotal);
    if (input.giftCardCode) {
      if (hasGiftCards) {
        throw new BadRequestException('Hediye kartı ile hediye kartı satın alınamaz.');
      }
      const { card, used } = await this.giftCards.redeem(input.giftCardCode, payable);
      giftCardTotal = used;
      giftCardId = card.id;
    }

    const grandTotal = round2(payable - giftCardTotal);

    /*
     * Stok dusumu ve siparis kaydi tek islemde (transaction) yapilir.
     * Stok, kosullu UPDATE ile atomik dusulur: ayni anda gelen iki siparis
     * son urunu birden satamaz, yetmeyen ilk kalemde islem geri alinir.
     */
    const order = await this.dataSource.transaction(async (manager) => {
      for (const item of orderItems) {
        if (item.itemType !== OrderItemType.PRODUCT || !item.productId) continue;

        // TypeORM'un query() metodu [satirlar, etkilenenSayisi] dondurur;
        // stok yetmediyse kosul tutmaz ve etkilenen satir 0 olur.
        const [, affected] = (await (item.variantId
          ? manager.query(
              'UPDATE product_variants SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING id',
              [item.quantity, item.variantId],
            )
          : manager.query(
              'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING id',
              [item.quantity, item.productId],
            ))) as [unknown[], number];

        if (!affected) {
          throw new BadRequestException(
            `"${item.name}${item.variantName ? ` — ${item.variantName}` : ''}" için stok az önce tükendi. Sepetinizi güncelleyip tekrar deneyin.`,
          );
        }
      }

      if (couponId) {
        await manager.increment(Coupon, { id: couponId }, 'usedCount', 1);
      }

      return manager.save(
        manager.create(Order, {
          orderNo: this.generateOrderNo(),
          paytrMerchantOid: 'MIA' + randomBytes(6).toString('hex').toUpperCase(),
          userId: input.userId ?? null,
          email: input.email.trim().toLowerCase(),
          status: OrderStatus.PENDING,
          paymentMethod: input.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          subtotal,
          discountTotal,
          giftCardTotal,
          shippingTotal,
          grandTotal,
          couponId,
          couponCode,
          giftCardId,
          shippingName: input.shippingName,
          shippingPhone: input.shippingPhone,
          shippingCity: input.shippingCity,
          shippingDistrict: input.shippingDistrict,
          shippingAddress: input.shippingAddress,
          shippingZip: input.shippingZip ?? null,
          invoiceType: input.invoiceType ?? 'INDIVIDUAL',
          invoiceTckn: input.invoiceTckn ?? null,
          invoiceCompanyName: input.invoiceCompanyName ?? null,
          invoiceTaxNo: input.invoiceTaxNo ?? null,
          invoiceTaxOffice: input.invoiceTaxOffice ?? null,
          invoiceAddress: input.invoiceAddress ?? null,
          statusHistory: [{ status: OrderStatus.PENDING, at: new Date().toISOString() }],
          note: input.note ?? null,
          items: orderItems,
        }),
      );
    });

    // Tamamen hediye kartiyla odendiyse odeme tamamlanmis sayilir
    if (grandTotal === 0 && giftCardTotal > 0) {
      await this.setPaymentStatus(order.id, PaymentStatus.PAID);
      order.paymentStatus = PaymentStatus.PAID;
      order.status = OrderStatus.CONFIRMED;
    }

    this.mail.orderCreated({
      email: order.email,
      orderNo: order.orderNo,
      grandTotal: order.grandTotal,
      paymentMethod: order.paymentMethod,
      items: orderItems.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      bank:
        order.paymentMethod === PaymentMethod.BANK_TRANSFER
          ? { bankName: store.bankName, ibanName: store.ibanName, iban: store.iban }
          : null,
    });

    // Adminlere yeni siparis bildirimi (ayarlardan acilip kapatilabilir)
    this.mail.orderCreatedAdmin({
      orderNo: order.orderNo,
      email: order.email,
      shippingName: order.shippingName,
      grandTotal: order.grandTotal,
      paymentMethod: order.paymentMethod,
      items: orderItems.map((i) => ({
        name: i.name + (i.variantName ? ` — ${i.variantName}` : ''),
        quantity: i.quantity,
      })),
    });

    // Bu siparisle stogu tukenen urunleri adminlere bildir
    void this.notifyDepletedStock(
      orderItems
        .filter((i) => i.itemType === OrderItemType.PRODUCT && i.productId)
        .map((i) => i.productId as string),
    );

    return order;
  }

  /** Siparis sonrasi stogu sifirlanan urunleri bulup admin bildirimi tetikler. */
  private async notifyDepletedStock(productIds: string[]) {
    if (!productIds.length) return;
    try {
      const products = await this.dataSource.getRepository(Product).find({
        where: { id: In([...new Set(productIds)]) },
        relations: { variants: true },
      });
      const depleted = products.filter((p) =>
        p.variants?.length
          ? p.variants.every((v) => v.stock <= 0)
          : p.stock <= 0,
      );
      if (depleted.length) {
        this.mail.stockDepletedAdmin(depleted.map((p) => ({ name: p.name, sku: p.sku })));
      }
    } catch {
      /* bildirim hatasi siparisi etkilemez */
    }
  }

  async track(orderNo: string, email: string): Promise<Order> {
    const order = await this.orders.findOne({
      where: { orderNo: orderNo.trim().toUpperCase(), email: email.trim().toLowerCase() },
      relations: { items: { product: { category: true }, boughtGiftCard: true } },
    });
    if (!order) throw new NotFoundException('Sipariş bulunamadı. Bilgileri kontrol edin.');
    return order;
  }

  async listForUser(userId: string): Promise<Order[]> {
    return this.orders.find({
      where: { userId },
      relations: { items: { product: { category: true }, boughtGiftCard: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async setPaymentStatus(orderId: string, status: PaymentStatus) {
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    order.paymentStatus = status;
    if (status === PaymentStatus.PAID && order.status === OrderStatus.PENDING) {
      order.status = OrderStatus.CONFIRMED;
      order.statusHistory = [
        ...(order.statusHistory ?? []),
        { status: OrderStatus.CONFIRMED, at: new Date().toISOString() },
      ];
    }
    await this.orders.save(order);

    // Odeme onaylaninca kargo gonderisini otomatik olustur (hata siparisi etkilemez)
    if (status === PaymentStatus.PAID) {
      void this.shipping.autoCreateForOrder(order.id);
    }

    // Odeme onaylaninca satin alinan hediye kartlarini aktive et + kodlari mail at
    if (status === PaymentStatus.PAID) {
      const activatedCards: GiftCard[] = [];
      for (const item of order.items) {
        if (item.itemType === OrderItemType.GIFT_CARD && item.boughtGiftCardId) {
          await this.giftCards.activate(item.boughtGiftCardId);
          const card = await this.giftCardRepo.findOne({
            where: { id: item.boughtGiftCardId },
          });
          if (card) activatedCards.push(card);
        }
      }
      this.mail.paymentConfirmed(
        order.email,
        order.orderNo,
        activatedCards.map((c) => ({ code: c.code, amount: c.initialAmount })),
      );
      for (const card of activatedCards) {
        if (card.recipientEmail) {
          this.mail.giftCardToRecipient({
            recipientEmail: card.recipientEmail,
            recipientName: card.recipientName,
            code: card.code,
            amount: card.initialAmount,
            message: card.message,
          });
        }
      }
    }
    return order;
  }

  /**
   * Musteri iptali: siparis no + e-posta esles ve siparis henuz
   * hazirlanmaya baslamamis (PENDING/CONFIRMED) olsun.
   */
  async cancelByCustomer(orderNo: string, email: string): Promise<Order> {
    const order = await this.orders.findOne({
      where: {
        orderNo: orderNo.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
      },
    });
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Bu sipariş zaten iptal edilmiş.');
    }
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        'Siparişiniz hazırlanmaya başlandığı için buradan iptal edilemiyor. Destek ekibimize yazabilirsiniz.',
      );
    }
    return this.cancel(order.id);
  }

  async cancel(orderId: string): Promise<Order> {
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: { items: true, giftCard: true },
    });
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    if (order.status === OrderStatus.CANCELLED) return order;

    // Stok iadesi (varyantli urunlerde varyant stogu geri verilir)
    for (const item of order.items) {
      if (item.itemType === OrderItemType.PRODUCT && item.productId) {
        if (item.variantId) {
          await this.variants.increment({ id: item.variantId }, 'stock', item.quantity);
        } else {
          await this.products.increment({ id: item.productId }, 'stock', item.quantity);
        }
      }
      // Satin alinan hediye kartlarini iptal et
      if (item.itemType === OrderItemType.GIFT_CARD && item.boughtGiftCardId) {
        await this.giftCardRepo.update(
          { id: item.boughtGiftCardId },
          { status: GiftCardStatus.DISABLED },
        );
      }
    }
    // Kupon hakki iadesi
    if (order.couponId) await this.coupons.unmarkUsed(order.couponId);
    // Odemede kullanilan hediye karti bakiyesi iadesi
    if (order.giftCardId && order.giftCardTotal > 0) {
      await this.giftCards.refund(order.giftCardId, order.giftCardTotal);
    }

    order.status = OrderStatus.CANCELLED;
    order.statusHistory = [
      ...(order.statusHistory ?? []),
      { status: OrderStatus.CANCELLED, at: new Date().toISOString() },
    ];
    if (order.paymentStatus === PaymentStatus.PAID) {
      order.paymentStatus = PaymentStatus.REFUNDED;
    }
    return this.orders.save(order);
  }
}
