/**
 * Baslangic verisi: kategoriler, 15 urun, admin kullanici, bulmaca kelimeleri, ornek kupon.
 * Calistir: npm run seed
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  Category,
  Coupon,
  CouponType,
  Product,
  ProductImage,
  PuzzleWord,
  Role,
  User,
} from './entities';
import { Address } from './entities/address.entity';
import { Favorite } from './entities/favorite.entity';
import { Review } from './entities/review.entity';
import { GiftCard } from './entities/gift-card.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { PuzzleWin } from './entities/puzzle.entity';
import { Setting } from './entities/setting.entity';
import { ContactMessage } from './entities/contact-message.entity';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User, Address, Category, Product, ProductImage, Favorite, Review,
    Coupon, GiftCard, Order, OrderItem, PuzzleWord, PuzzleWin, Setting, ContactMessage,
  ],
  synchronize: true,
});

const PLACEHOLDERS = [
  '/products/placeholder-1.jpg',
  '/products/placeholder-2.png',
  '/products/placeholder-3.png',
  '/products/placeholder-4.jpg',
  '/products/placeholder-5.jpg',
  '/products/placeholder-6.jpg',
];

interface SeedProduct {
  name: string;
  slug: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  isFeatured?: boolean;
  description: string;
  material: string;
  dimensions: string;
}

const CARE =
  'Nemli, yumuşak bir bezle silerek temizleyiniz. Asit içeren temizleyicilerden ve bulaşık makinesinden uzak tutunuz. Doğal taş olduğu için her ürünün deseni kendine özgüdür.';

const PRODUCTS: SeedProduct[] = [
  {
    name: 'Traverten Mumluk',
    slug: 'traverten-mumluk',
    category: 'Mumluklar',
    price: 749, compareAtPrice: 899, stock: 14, isFeatured: true,
    description:
      'Doğal travertenden elde işçilikle şekillendirilen bu mumluk, kalın gövdesi ve çanak formlu üst yüzeyiyle sofralara ve konsollara heykelsi bir duruş katar. İkili kombin halinde kullanıldığında etkisi katlanır.',
    material: 'Doğal traverten', dimensions: 'Büyük: 18 × 10 cm · Küçük: 10 × 10 cm',
  },
  {
    name: 'Dekoratif Tabak 4 cm',
    slug: 'dekoratif-tabak-4-cm',
    category: 'Dekoratif Tabaklar',
    price: 549, stock: 20, isFeatured: true,
    description:
      'Takılarınız, anahtarlarınız ya da küçük değerli eşyalarınız için tasarlanmış doğal traverten tabak. 4 cm derinliğindeki iç haznesi gün ışığında taşın dokusunu öne çıkarır.',
    material: 'Doğal traverten', dimensions: 'Çap 20 cm · Derinlik 4 cm',
  },
  {
    name: 'Ayaklı Dekoratif Tabak',
    slug: 'ayakli-dekoratif-tabak',
    category: 'Dekoratif Tabaklar',
    price: 899, compareAtPrice: 1049, stock: 12, isFeatured: true,
    description:
      'Yükseltilmiş ayak detayıyla meyvelerinizi ve sunumlarınızı adeta bir vitrine dönüştürür. Masif travertenden tek parça oyularak üretilmiştir.',
    material: 'Doğal traverten', dimensions: 'Çap 24 cm · Yükseklik 10 cm',
  },
  {
    name: 'Çatal Bıçak Tutucu',
    slug: 'catal-bicak-tutucu',
    category: 'Sunum & Mutfak',
    price: 349, stock: 30,
    description:
      'Sofra düzenine zarif bir dokunuş: mermer ve traverten seçenekleriyle çatal bıçak tutucu, davet sofralarının küçük ama unutulmaz detayı.',
    material: 'Doğal mermer / traverten', dimensions: '9 × 2,5 × 2 cm',
  },
  {
    name: 'Silindir Kap',
    slug: 'silindir-kap',
    category: 'Kutular',
    price: 799, stock: 10, isFeatured: true,
    description:
      'Kapaklı silindir formuyla hem saklama alanı hem de başlı başına bir obje. Pamuk, takı ya da banyo aksesuarları için ideal.',
    material: 'Doğal traverten', dimensions: 'Çap 12 cm · Yükseklik 15 cm',
  },
  {
    name: 'Dekoratif Tabak 6 cm',
    slug: 'dekoratif-tabak-6-cm',
    category: 'Dekoratif Tabaklar',
    price: 699, stock: 16,
    description:
      '6 cm derin haznesiyle meyve sunumundan takı düzenlemeye kadar çok amaçlı kullanım sunar. Her tabağın gözenek deseni kendine özgüdür.',
    material: 'Doğal traverten', dimensions: 'Çap 22 cm · Derinlik 6 cm',
  },
  {
    name: 'Konik Mumluk',
    slug: 'konik-mumluk',
    category: 'Mumluklar',
    price: 649, stock: 18,
    description:
      'Yukarı doğru incelen konik gövdesiyle tealight mumlarınıza mimari bir kaide sunar. İkili set halinde farklı yüksekliklerde üretilir.',
    material: 'Doğal traverten', dimensions: 'Büyük: 15 × 7 cm · Küçük: 11 × 7 cm',
  },
  {
    name: 'Şamdan',
    slug: 'samdan',
    category: 'Mumluklar',
    price: 849, compareAtPrice: 999, stock: 12, isFeatured: true,
    description:
      'Boğumlu silüetiyle klasik şamdan formunu çağdaş bir yoruma taşır. İnce mumlarla kullanıldığında yemek masalarının odak noktası olur.',
    material: 'Doğal traverten', dimensions: 'Yükseklik 20 cm · Taban çapı 7 cm',
  },
  {
    name: 'Kare Altlık',
    slug: 'kare-altlik',
    category: 'Sunum & Mutfak',
    price: 249, stock: 40,
    description:
      'Fincanınızın ya da bardağınızın altında doğal taşın sıcaklığı. Gözenekli dokusuyla her altlık tektir; yüzeyleri sıvıya karşı koruma sağlar.',
    material: 'Doğal traverten', dimensions: '10 × 10 cm',
  },
  {
    name: 'Yuvarlak Altlık',
    slug: 'yuvarlak-altlik',
    category: 'Sunum & Mutfak',
    price: 249, stock: 40,
    description:
      'Yumuşak hatlı yuvarlak formuyla espresso fincanlarından su bardaklarına kadar her sunuma eşlik eder.',
    material: 'Doğal traverten', dimensions: 'Çap 10 cm',
  },
  {
    name: 'Kutu — Traverten',
    slug: 'kutu-traverten',
    category: 'Kutular',
    price: 1099, stock: 8, isFeatured: true,
    description:
      'Kapaklı traverten kutu; takılarınız ve özel eşyalarınız için doğal taştan bir mücevher kutusu. Kapak yüzeyi taşın damar desenini sergiler.',
    material: 'Doğal traverten', dimensions: 'Çap 13 cm · Yükseklik 16 cm',
  },
  {
    name: 'Kutu — Elazığ Vişne',
    slug: 'kutu-elazig-visne',
    category: 'Kutular',
    price: 1199, stock: 6,
    description:
      'Türkiye’nin dünyaca ünlü Elazığ Vişne mermerinden üretilen bu kutu, bordo tonları ve beyaz damarlarıyla koleksiyonluk bir parça.',
    material: 'Elazığ Vişne mermeri', dimensions: 'Çap 13 cm · Yükseklik 16 cm',
  },
  {
    name: 'Kutu — Yeşil',
    slug: 'kutu-yesil',
    category: 'Kutular',
    price: 1199, stock: 6,
    description:
      'Derin yeşil tonlarındaki doğal mermerden üretilen kapaklı kutu, koyu mobilyalarla çarpıcı bir kontrast oluşturur.',
    material: 'Doğal yeşil mermer', dimensions: 'Çap 13 cm · Yükseklik 16 cm',
  },
  {
    name: 'Dalgalı Vazo',
    slug: 'dalgali-vazo',
    category: 'Vazolar',
    price: 1299, compareAtPrice: 1499, stock: 9, isFeatured: true,
    description:
      'Spiral kıvrımlarıyla ışığı yakalayan dalgalı vazo, kuru çiçeklerle de tek başına da güçlü bir tasarım objesi. Krem rengi yüzeyi her dekora uyum sağlar.',
    material: 'Seramik', dimensions: 'Yükseklik 25 cm · Genişlik 17 cm',
  },
  {
    name: 'Desenli Vazo',
    slug: 'desenli-vazo',
    category: 'Vazolar',
    price: 1499, stock: 7,
    description:
      'El işçiliğiyle kabartma desenlendirilen bu vazo, zeytin dalları ve kuru çiçeklerle Akdeniz esintili bir kompozisyon kurar.',
    material: 'Seramik', dimensions: 'Yükseklik 30 cm · Genişlik 19 cm',
  },
];

const PUZZLE_WORDS: { word: string; hint: string }[] = [
  { word: 'TRAVERTEN', hint: 'Koleksiyonumuzun ana malzemesi olan doğal taş' },
  { word: 'MUMLUK', hint: 'Ambiyansın olmazsa olmazı, ışığın taştan kaidesi' },
  { word: 'VAZO', hint: 'Çiçeklerin zarif evi' },
  { word: 'MERMER', hint: 'Elazığ Vişne bunun en ünlü türlerinden' },
  { word: 'DEKOR', hint: 'Evinize kattığımız şey' },
];

async function main() {
  await dataSource.initialize();
  console.log('Veritabanına bağlanıldı, tablolar senkronize edildi.');

  const users = dataSource.getRepository(User);
  const categories = dataSource.getRepository(Category);
  const products = dataSource.getRepository(Product);
  const images = dataSource.getRepository(ProductImage);
  const words = dataSource.getRepository(PuzzleWord);
  const coupons = dataSource.getRepository(Coupon);
  const settings = dataSource.getRepository(Setting);

  // Admin
  const adminEmail = 'admin@miamiss.com';
  if (!(await users.findOne({ where: { email: adminEmail } }))) {
    await users.save(
      users.create({
        email: adminEmail,
        name: 'Miamisu Home Admin',
        role: Role.ADMIN,
        passwordHash: await bcrypt.hash('miamiss2026', 10),
      }),
    );
    console.log(`Admin oluşturuldu -> ${adminEmail} / miamiss2026`);
  }

  // Kategoriler
  const categoryNames = ['Mumluklar', 'Dekoratif Tabaklar', 'Sunum & Mutfak', 'Kutular', 'Vazolar'];
  const slugMap: Record<string, string> = {
    Mumluklar: 'mumluklar',
    'Dekoratif Tabaklar': 'dekoratif-tabaklar',
    'Sunum & Mutfak': 'sunum-mutfak',
    Kutular: 'kutular',
    Vazolar: 'vazolar',
  };
  const catEntities = new Map<string, Category>();
  for (const [i, name] of categoryNames.entries()) {
    let cat = await categories.findOne({ where: { slug: slugMap[name] } });
    if (!cat) {
      cat = await categories.save(categories.create({ name, slug: slugMap[name], sortOrder: i }));
    }
    catEntities.set(name, cat);
  }
  console.log('Kategoriler hazır.');

  // Urunler
  for (const [i, p] of PRODUCTS.entries()) {
    const existing = await products.findOne({ where: { slug: p.slug } });
    if (existing) continue;
    const product = await products.save(
      products.create({
        name: p.name,
        slug: p.slug,
        description: p.description,
        material: p.material,
        dimensions: p.dimensions,
        care: CARE,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        stock: p.stock,
        isActive: true,
        isFeatured: p.isFeatured ?? false,
        categoryId: catEntities.get(p.category)!.id,
      }),
    );
    await images.save([
      images.create({
        productId: product.id,
        url: PLACEHOLDERS[i % PLACEHOLDERS.length],
        sortOrder: 0,
        alt: p.name,
      }),
      images.create({
        productId: product.id,
        url: PLACEHOLDERS[(i + 1) % PLACEHOLDERS.length],
        sortOrder: 1,
        alt: p.name,
      }),
    ]);
  }
  console.log(`${PRODUCTS.length} ürün hazır.`);

  // Bulmaca kelimeleri
  for (const w of PUZZLE_WORDS) {
    if (!(await words.findOne({ where: { word: w.word } }))) {
      await words.save(words.create({ ...w, isActive: true }));
    }
  }
  console.log('Bulmaca kelimeleri hazır.');

  // Hosgeldin kuponu
  if (!(await coupons.findOne({ where: { code: 'HOSGELDIN10' } }))) {
    await coupons.save(
      coupons.create({
        code: 'HOSGELDIN10',
        type: CouponType.PERCENT,
        value: 10,
        minOrderTotal: 500,
        isActive: true,
      }),
    );
    console.log('HOSGELDIN10 kuponu oluşturuldu (%10, min 500 TL).');
  }

  // Magaza ayarlari
  if (!(await settings.findOne({ where: { key: 'store' } }))) {
    await settings.save(
      settings.create({
        key: 'store',
        value: {
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
          announcement: '1500 TL üzeri siparişlerde kargo ücretsiz ✨',
        },
      }),
    );
  }

  console.log('Seed tamamlandı.');
  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
