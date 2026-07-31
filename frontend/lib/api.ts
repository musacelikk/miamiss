/**
 * Backend tum endpoint'leri "/api" onekiyle sunar. Env degiskeni onek ile de
 * onek olmadan da girilebilsin diye burada normalize ediliyor.
 */
function normalizeApiUrl(base: string): string {
  const trimmed = base.replace(/\/+$/, "")
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`
}

function resolveApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL)
  }
  // Env verilmemisse: canli domainde api subdomain'i, gelistirmede localhost
  if (typeof window !== "undefined" && window.location.hostname.endsWith("miamisuhome.com")) {
    return "https://api.miamisuhome.com/api"
  }
  return "http://localhost:4000/api"
}

export const API_URL = resolveApiUrl()

export const TOKEN_KEY = "miamiss_token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options
  const token = auth ? getToken() : null
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body && !(rest.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })
  if (!res.ok) {
    let message = "Bir şeyler ters gitti, lütfen tekrar deneyin."
    try {
      const data = await res.json()
      message = Array.isArray(data.message) ? data.message[0] : (data.message ?? message)
    } catch {
      /* gövde yoksa varsayılan mesaj */
    }
    throw new ApiError(message, res.status)
  }
  return res.json() as Promise<T>
}

/* ---- Paylaşılan tipler ---- */

export interface ProductImage {
  id: string
  url: string
  alt: string | null
  sortOrder: number
}

export interface Category {
  id: string
  name: string
  slug: string
  sortOrder: number
  image?: string | null
}

export interface HomepageSettings {
  heroEyebrow: string
  heroTitle: string
  heroTitleAccent: string
  heroTitleSuffix: string
  heroSubtitle: string
  heroPrimaryText: string
  heroPrimaryUrl: string
  heroSecondaryText: string
  heroSecondaryUrl: string
  heroBadge: string
  heroImages: string[]
  values: { title: string; desc: string }[]
  categoriesEyebrow: string
  categoriesTitle: string
  featuredEyebrow: string
  featuredTitle: string
  giftEyebrow: string
  giftTitle: string
  giftTitleAccent: string
  giftText: string
  giftButtonText: string
  storyEyebrow: string
  storyQuote: string
  storyText: string
}

export const DEFAULT_HOMEPAGE: HomepageSettings = {
  heroEyebrow: "Doğal Taş Ev Aksesuarları",
  heroTitle: "Taşın zamansız",
  heroTitleAccent: "zarafeti",
  heroTitleSuffix: ", evinizde.",
  heroSubtitle:
    "Milyonlarca yılda oluşan traverten ve mermer, usta ellerde mumluklara, vazolara ve sofranızın en zarif detaylarına dönüşüyor. Her parça tektir — tıpkı eviniz gibi.",
  heroPrimaryText: "Koleksiyonu Keşfet",
  heroPrimaryUrl: "/urunler",
  heroSecondaryText: "Hediye Kartı",
  heroSecondaryUrl: "/hediye-karti",
  heroBadge: "El İşçiliği",
  heroImages: [
    "/products/placeholder-5.jpg",
    "/products/placeholder-1.jpg",
    "/products/placeholder-4.jpg",
    "/products/placeholder-6.jpg",
  ],
  values: [
    { title: "%100 Doğal Taş", desc: "Gerçek traverten ve mermer" },
    { title: "El İşçiliği", desc: "Her parça tek ve özgün" },
    { title: "Özenli Kargo", desc: "Darbeye dayanıklı paketleme" },
    { title: "Kolay İade", desc: "14 gün içinde ücretsiz" },
  ],
  categoriesEyebrow: "Kategoriler",
  categoriesTitle: "Ne Arıyorsunuz?",
  featuredEyebrow: "Seçki",
  featuredTitle: "Öne Çıkanlar",
  giftEyebrow: "Hediye Kartı",
  giftTitle: "Sevdiklerinize taş gibi",
  giftTitleAccent: "sağlam bir hediye",
  giftText:
    "Seçim yapmak zor olabilir. 100 TL'den 10.000 TL'ye kadar istediğiniz tutarda hediye kartı oluşturun, kişisel notunuzla birlikte e-posta ile ulaştıralım.",
  giftButtonText: "Hediye Kartı Al",
  storyEyebrow: "Miamisu Home",
  storyQuote:
    "“Doğanın milyonlarca yılda şekillendirdiği taşı, usta ellerle evinizin en özel köşelerine taşıyoruz.”",
  storyText:
    "Her Miamisu Home ürünü, Anadolu'nun doğal taş ocaklarından seçilen traverten ve mermer bloklarından tek tek işlenir. Gözenekleri, damarları ve tonlarıyla iki ürün asla birbirinin aynısı değildir — evinize gelen parça yalnızca sizindir.",
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  material: string | null
  dimensions: string | null
  care: string | null
  color?: string | null
  origin?: string | null
  features?: string | null
  boxContents?: string | null
  widthCm?: number | null
  heightCm?: number | null
  depthCm?: number | null
  weightKg?: number | null
  shippingFee?: number | null
  price: number
  compareAtPrice: number | null
  stock: number
  isActive: boolean
  isFeatured: boolean
  viewCount?: number
  categoryId: string | null
  category?: Category | null
  images: ProductImage[]
  avgRating?: number | null
  reviewCount?: number
  createdAt: string
}

export interface ProductDetail extends Product {
  reviews: {
    id: string
    rating: number
    comment: string
    createdAt: string
    userName: string
  }[]
  related: Product[]
}

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  role: "ADMIN" | "CUSTOMER"
}

export interface Address {
  id: string
  title: string
  fullName: string
  phone: string
  city: string
  district: string
  address: string
  zip: string | null
  isDefault: boolean
}

export interface StoreSettings {
  shippingFee: number
  freeShippingThreshold: number
  codFee: number
  bankName: string
  ibanName: string
  iban: string
  contactEmail: string
  contactPhone: string
  whatsapp: string
  instagram: string
  address: string
  announcement: string
  announcementUrl: string
  desiPrices: { desi: number; price: number }[]
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string | null
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
}

/** Desi = max(agirlik kg, hacim/3000). Tarifeden ilk yeterli kademe secilir. */
export function estimateDesi(p: {
  widthCm?: number | null
  heightCm?: number | null
  depthCm?: number | null
  weightKg?: number | null
}): number | null {
  const volume =
    p.widthCm && p.heightCm && p.depthCm
      ? (p.widthCm * p.heightCm * p.depthCm) / 3000
      : 0
  const desi = Math.max(volume, p.weightKg ?? 0)
  return desi > 0 ? Math.ceil(desi * 10) / 10 : null
}

export function estimateShippingCost(
  desi: number | null,
  desiPrices: { desi: number; price: number }[],
): number | null {
  if (desi == null || !desiPrices?.length) return null
  const sorted = [...desiPrices].sort((a, b) => a.desi - b.desi)
  const tier = sorted.find((t) => desi <= t.desi) ?? sorted[sorted.length - 1]
  return tier.price
}

export interface OrderItem {
  id: string
  itemType: "PRODUCT" | "GIFT_CARD"
  productId: string | null
  name: string
  imageUrl: string | null
  unitPrice: number
  quantity: number
  boughtGiftCard?: { code: string; status: string } | null
}

export interface Order {
  id: string
  orderNo: string
  email: string
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED"
  paymentMethod: "BANK_TRANSFER" | "COD" | "CARD"
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
  subtotal: number
  discountTotal: number
  giftCardTotal: number
  shippingTotal: number
  grandTotal: number
  couponCode: string | null
  shippingName: string
  shippingPhone: string
  shippingCity: string
  shippingDistrict: string
  shippingAddress: string
  shippingZip: string | null
  note: string | null
  trackingNo: string | null
  cargoCompany: string | null
  items: OrderItem[]
  createdAt: string
}

export const ORDER_STATUS_TR: Record<Order["status"], string> = {
  PENDING: "Onay Bekliyor",
  CONFIRMED: "Onaylandı",
  PREPARING: "Hazırlanıyor",
  SHIPPED: "Kargoya Verildi",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal Edildi",
}

export const PAYMENT_STATUS_TR: Record<Order["paymentStatus"], string> = {
  PENDING: "Ödeme Bekliyor",
  PAID: "Ödendi",
  FAILED: "Başarısız",
  REFUNDED: "İade Edildi",
}

export const PAYMENT_METHOD_TR: Record<Order["paymentMethod"], string> = {
  BANK_TRANSFER: "Havale / EFT",
  COD: "Kapıda Ödeme",
  CARD: "Kredi Kartı",
}

/** Görsel URL'i: backend'den mutlak gelirse aynen, göreliyse frontend public'ten */
export function imageUrl(url: string | null | undefined): string {
  if (!url) return "/placeholder.svg"
  return url
}
