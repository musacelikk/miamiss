import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../entities';

export interface StoreSettings {
  shippingFee: number;
  freeShippingThreshold: number;
  codFee: number;
  bankName: string;
  ibanName: string;
  iban: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp: string;
  instagram: string;
  address: string;
  announcement: string;
  announcementUrl: string;
  /* Geliver gonderici (kargo cikis) bilgileri */
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  senderCity: string;
  senderDistrict: string;
  senderAddress: string;
  senderZip: string;
  /** Otomatik gonderide kullanilacak varsayilan desi */
  defaultDesi: number;
  /** Desi kademesine gore kargo tarifesi (admin panelde tahmini ucret icin) */
  desiPrices: { desi: number; price: number }[];
}

export const DEFAULT_SETTINGS: StoreSettings = {
  shippingFee: 79.9,
  freeShippingThreshold: 1500,
  codFee: 25,
  bankName: '',
  ibanName: '',
  iban: '',
  contactEmail: 'info@miamisuhome.com',
  contactPhone: '',
  whatsapp: '',
  instagram: 'miamiss',
  address: '',
  announcement: '1500 TL üzeri siparişlerde kargo ücretsiz',
  announcementUrl: '',
  senderName: 'Miamisu Home',
  senderPhone: '',
  senderEmail: 'info@miamisuhome.com',
  senderCity: '',
  senderDistrict: '',
  senderAddress: '',
  senderZip: '',
  defaultDesi: 2,
  desiPrices: [
    { desi: 1, price: 65 },
    { desi: 2, price: 75 },
    { desi: 3, price: 85 },
    { desi: 5, price: 110 },
    { desi: 10, price: 160 },
    { desi: 15, price: 210 },
    { desi: 20, price: 260 },
    { desi: 30, price: 350 },
  ],
};

const KEY = 'store';
const HOMEPAGE_KEY = 'homepage';
const PUZZLE_KEY = 'puzzle';
const NOTIFICATIONS_KEY = 'notifications';
const SEO_KEY = 'seo';

/** Bulmaca odul kuponu ayarlari */
export interface PuzzleSettings {
  /** Indirim yuzdesi */
  rewardPercent: number;
  /** Kodun gecerlilik suresi (gun) */
  rewardValidityDays: number;
  /** Kodun kac kez kullanilabilecegi */
  rewardMaxUses: number;
}

export const DEFAULT_PUZZLE: PuzzleSettings = {
  rewardPercent: 10,
  rewardValidityDays: 7,
  rewardMaxUses: 1,
};

/** Hangi olayda adminlere mail gonderilecegi */
export interface NotificationSettings {
  orderCreated: boolean;
  returnRequested: boolean;
  stockDepleted: boolean;
  newUser: boolean;
  reviewCreated: boolean;
  contactMessage: boolean;
  supportTicket: boolean;
}

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  orderCreated: true,
  returnRequested: true,
  stockDepleted: true,
  newUser: true,
  reviewCreated: true,
  contactMessage: true,
  supportTicket: true,
};

/** Site geneli SEO ve pazarlama etiketi ayarlari */
export interface SeoSettings {
  siteTitle: string;
  siteDescription: string;
  keywords: string;
  ogImage: string;
  googleSiteVerification: string;
  /** GA4 olcum kimligi (G-XXXX) */
  googleAnalyticsId: string;
  /** Google Ads donusum kimligi (AW-XXXX) */
  googleAdsId: string;
  /** Meta (Facebook) Pixel kimligi */
  metaPixelId: string;
}

export const DEFAULT_SEO: SeoSettings = {
  siteTitle: 'Miamisu Home — Doğal Taş Ev Aksesuarları',
  siteDescription:
    'Doğal traverten ve mermerden el işçiliğiyle üretilen mumluklar, vazolar, tepsiler ve ev aksesuarları. Her parça tektir.',
  keywords:
    'traverten, mermer, doğal taş, mumluk, vazo, ev aksesuarları, el işçiliği, dekorasyon',
  ogImage: '/logo/logo.png',
  googleSiteVerification: '',
  googleAnalyticsId: '',
  googleAdsId: '',
  metaPixelId: '',
};

export interface HomepageSettings {
  /** Hero arkaplani: kolaj (varsayilan), tam ekran video veya tam ekran gorsel */
  heroBackgroundType: 'collage' | 'video' | 'image';
  /** Tam ekran video: admin panelinden S3/CloudFront'a yuklenen kalici URL */
  heroBackgroundVideo: string;
  /** Tam ekran arkaplan gorseli */
  heroBackgroundImage: string;
  /** Arkaplan uzerindeki karartma orani (0-80) */
  heroOverlayOpacity: number;
  heroEyebrow: string;
  heroTitle: string;
  heroTitleAccent: string;
  heroTitleSuffix: string;
  heroSubtitle: string;
  heroPrimaryText: string;
  heroPrimaryUrl: string;
  heroSecondaryText: string;
  heroSecondaryUrl: string;
  heroBadge: string;
  heroImages: string[];
  values: { title: string; desc: string }[];
  categoriesEyebrow: string;
  categoriesTitle: string;
  featuredEyebrow: string;
  featuredTitle: string;
  giftEyebrow: string;
  giftTitle: string;
  giftTitleAccent: string;
  giftText: string;
  giftButtonText: string;
  storyEyebrow: string;
  storyQuote: string;
  storyText: string;
}

export const DEFAULT_HOMEPAGE: HomepageSettings = {
  heroBackgroundType: 'collage',
  heroBackgroundVideo: '',
  heroBackgroundImage: '',
  heroOverlayOpacity: 40,
  heroEyebrow: 'Doğal Taş Ev Aksesuarları',
  heroTitle: 'Taşın zamansız',
  heroTitleAccent: 'zarafeti',
  heroTitleSuffix: ', evinizde.',
  heroSubtitle:
    'Milyonlarca yılda oluşan traverten ve mermer, usta ellerde mumluklara, vazolara ve sofranızın en zarif detaylarına dönüşüyor. Her parça tektir — tıpkı eviniz gibi.',
  heroPrimaryText: 'Koleksiyonu Keşfet',
  heroPrimaryUrl: '/urunler',
  heroSecondaryText: 'Hediye Kartı',
  heroSecondaryUrl: '/hediye-karti',
  heroBadge: 'El İşçiliği',
  heroImages: [
    '/products/placeholder-5.jpg',
    '/products/placeholder-1.jpg',
    '/products/placeholder-4.jpg',
    '/products/placeholder-6.jpg',
  ],
  values: [
    { title: '%100 Doğal Taş', desc: 'Gerçek traverten ve mermer' },
    { title: 'El İşçiliği', desc: 'Her parça tek ve özgün' },
    { title: 'Özenli Kargo', desc: 'Darbeye dayanıklı paketleme' },
    { title: 'Kolay İade', desc: '14 gün içinde ücretsiz' },
  ],
  categoriesEyebrow: 'Kategoriler',
  categoriesTitle: 'Ne Arıyorsunuz?',
  featuredEyebrow: 'Seçki',
  featuredTitle: 'Öne Çıkanlar',
  giftEyebrow: 'Hediye Kartı',
  giftTitle: 'Sevdiklerinize taş gibi',
  giftTitleAccent: 'sağlam bir hediye',
  giftText:
    "Seçim yapmak zor olabilir. 100 TL'den 10.000 TL'ye kadar istediğiniz tutarda hediye kartı oluşturun, kişisel notunuzla birlikte e-posta ile ulaştıralım.",
  giftButtonText: 'Hediye Kartı Al',
  storyEyebrow: 'Miamisu Home',
  storyQuote:
    '“Doğanın milyonlarca yılda şekillendirdiği taşı, usta ellerle evinizin en özel köşelerine taşıyoruz.”',
  storyText:
    "Her Miamisu Home ürünü, Anadolu'nun doğal taş ocaklarından seçilen traverten ve mermer bloklarından tek tek işlenir. Gözenekleri, damarları ve tonlarıyla iki ürün asla birbirinin aynısı değildir — evinize gelen parça yalnızca sizindir.",
};

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(Setting) private readonly repo: Repository<Setting>) {}

  async get(): Promise<StoreSettings> {
    const row = await this.repo.findOne({ where: { key: KEY } });
    return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<StoreSettings>) ?? {}) };
  }

  async update(patch: Partial<StoreSettings>): Promise<StoreSettings> {
    const current = await this.get();
    const next = { ...current, ...patch };
    await this.repo.save(this.repo.create({ key: KEY, value: next }));
    return next;
  }

  async getHomepage(): Promise<HomepageSettings> {
    const row = await this.repo.findOne({ where: { key: HOMEPAGE_KEY } });
    return { ...DEFAULT_HOMEPAGE, ...((row?.value as Partial<HomepageSettings>) ?? {}) };
  }

  async updateHomepage(patch: Partial<HomepageSettings>): Promise<HomepageSettings> {
    const current = await this.getHomepage();
    const next = { ...current, ...patch };
    await this.repo.save(this.repo.create({ key: HOMEPAGE_KEY, value: next }));
    return next;
  }

  async getPuzzle(): Promise<PuzzleSettings> {
    const row = await this.repo.findOne({ where: { key: PUZZLE_KEY } });
    return { ...DEFAULT_PUZZLE, ...((row?.value as Partial<PuzzleSettings>) ?? {}) };
  }

  async updatePuzzle(patch: Partial<PuzzleSettings>): Promise<PuzzleSettings> {
    const next = { ...(await this.getPuzzle()), ...patch };
    await this.repo.save(this.repo.create({ key: PUZZLE_KEY, value: next }));
    return next;
  }

  async getNotifications(): Promise<NotificationSettings> {
    const row = await this.repo.findOne({ where: { key: NOTIFICATIONS_KEY } });
    return { ...DEFAULT_NOTIFICATIONS, ...((row?.value as Partial<NotificationSettings>) ?? {}) };
  }

  async updateNotifications(patch: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const next = { ...(await this.getNotifications()), ...patch };
    await this.repo.save(this.repo.create({ key: NOTIFICATIONS_KEY, value: next }));
    return next;
  }

  async getSeo(): Promise<SeoSettings> {
    const row = await this.repo.findOne({ where: { key: SEO_KEY } });
    return { ...DEFAULT_SEO, ...((row?.value as Partial<SeoSettings>) ?? {}) };
  }

  async updateSeo(patch: Partial<SeoSettings>): Promise<SeoSettings> {
    const next = { ...(await this.getSeo()), ...patch };
    await this.repo.save(this.repo.create({ key: SEO_KEY, value: next }));
    return next;
  }
}
