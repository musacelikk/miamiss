"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import {
  BellRing,
  Check,
  ChevronRight,
  Heart,
  Minus,
  Package,
  Plus,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react"
import { toast } from "sonner"
import {
  activeVariants,
  api,
  imageUrl,
  type ProductDetail,
  type ProductVariant,
} from "@/lib/api"
import { formatDate, formatPrice } from "@/lib/format"
import { useAuth, useCart, useFavorites } from "@/components/providers"
import { ProductCard } from "@/components/site/product-card"
import { RecentlyViewed, recordView } from "@/components/site/recently-viewed"
import { cn } from "@/lib/utils"

function StockAlertForm({ productId }: { productId: string }) {
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await api<{ message: string }>("/stock-alerts", {
        method: "POST",
        body: JSON.stringify({ productId, email }),
        auth: false,
      })
      toast.success(res.message)
      setDone(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
        <Check className="h-4 w-4 shrink-0" />
        Kaydınız alındı — ürün stoğa girince e-posta göndereceğiz.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-md border border-accent/40 bg-secondary/50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BellRing className="h-4 w-4 text-accent" /> Gelince haber ver
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        E-postanı bırak, ürün stoğa girer girmez sana haber verelim.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@eposta.com"
          className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          disabled={busy}
          className="shrink-0 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          {busy ? "..." : "Haber Ver"}
        </button>
      </div>
    </form>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < Math.round(value) ? "fill-accent text-accent" : "text-border",
          )}
        />
      ))}
    </span>
  )
}

export function ProductDetailClient({ slug }: { slug: string }) {
  const { addProduct } = useCart()
  const { isFavorite, toggle } = useFavorites()
  const { user } = useAuth()

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  // Varyant secilince (gorseli varsa) galeriyi gecici olarak o gorsele cevirir;
  // kullanici bir kucuk resme tiklarsa normal galeriye doner
  const [variantImageOverride, setVariantImageOverride] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [variant, setVariant] = useState<ProductVariant | null>(null)
  const [tab, setTab] = useState<"desc" | "detail" | "care" | "shipping">("desc")
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState("")
  const [reviewBusy, setReviewBusy] = useState(false)

  useEffect(() => {
    setProduct(null)
    setActiveImage(0)
    setQuantity(1)
    setVariant(null)
    api<ProductDetail>(`/products/${slug}`, { auth: false })
      .then((p) => {
        setProduct(p)
        const options = activeVariants(p)
        setVariant(options.find((v) => v.stock > 0) ?? options[0] ?? null)
        recordView(p)
      })
      .catch(() => setNotFound(true))
  }, [slug])

  if (notFound) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-32 text-center">
        <p className="font-display text-3xl">Ürün bulunamadı</p>
        <Link href="/urunler" className="mt-4 inline-block text-sm text-accent hover:underline">
          Koleksiyona dön
        </Link>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-square rounded-md bg-muted" />
          <div className="space-y-4 pt-6">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-10 w-3/4 rounded bg-muted" />
            <div className="h-6 w-32 rounded bg-muted" />
            <div className="h-24 w-full rounded bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  const fav = isFavorite(product.id)
  const options = activeVariants(product)
  const hasVariants = options.length > 0
  const price = variant ? variant.price : product.price
  const compareAt = variant ? variant.compareAtPrice : product.compareAtPrice
  const stock = variant ? variant.stock : product.stock
  const outOfStock = hasVariants ? !variant || variant.stock <= 0 : product.stock <= 0
  const images = product.images?.length ? product.images : [{ id: "ph", url: null, alt: null, sortOrder: 0 }]

  const addToCart = () => {
    if (hasVariants && !variant) {
      toast.error("Lütfen bir seçenek belirleyin.")
      return
    }
    addProduct(product, quantity, variant)
    toast.success(
      `${product.name}${variant ? ` — ${variant.name}` : ""} (${quantity} adet) sepete eklendi`,
    )
  }

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setReviewBusy(true)
    try {
      const res = await api<{ message: string }>(`/products/${slug}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      })
      toast.success(res.message)
      setReviewComment("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yorum gönderilemedi")
    } finally {
      setReviewBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Anasayfa</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/urunler" className="hover:text-foreground">Koleksiyon</Link>
        {product.category && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link
              href={`/urunler?category=${product.category.slug}`}
              className="hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Galeri */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
            <Image
              src={imageUrl(variantImageOverride ?? images[activeImage]?.url)}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              className="object-cover"
            />
            {compareAt && compareAt > price && (
              <span className="absolute left-4 top-4 rounded-sm bg-accent px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                %{Math.round((1 - price / compareAt) * 100)} indirim
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-3">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => {
                    setActiveImage(i)
                    setVariantImageOverride(null)
                  }}
                  className={cn(
                    "overflow-hidden rounded-md border-2 transition-colors",
                    i === activeImage ? "border-accent" : "border-transparent",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(img.url)}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bilgi */}
        <div>
          {product.category && (
            <p className="eyebrow mb-3">{product.category.name}</p>
          )}
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">{product.name}</h1>

          {product.reviewCount != null && product.reviewCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Stars value={product.avgRating ?? 0} />
              <span>
                {product.avgRating} · {product.reviewCount} değerlendirme
              </span>
            </div>
          )}

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatPrice(price)}</span>
            {compareAt && compareAt > price && (
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(compareAt)}
              </span>
            )}
          </div>

          <p className="mt-6 leading-relaxed text-muted-foreground">{product.description}</p>

          {/* Seçenekler */}
          {hasVariants && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Seçenek
              </p>
              <div className="flex flex-wrap gap-2">
                {options.map((v) => {
                  const selected = variant?.id === v.id
                  const soldOut = v.stock <= 0
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        setVariant(v)
                        setQuantity(1)
                        setVariantImageOverride(v.image ?? null)
                      }}
                      disabled={soldOut}
                      className={cn(
                        "rounded-md border px-4 py-2.5 text-sm transition-colors",
                        selected
                          ? "border-accent bg-accent/10 font-semibold text-accent"
                          : "border-border hover:border-accent",
                        soldOut && "cursor-not-allowed text-muted-foreground line-through opacity-50",
                      )}
                    >
                      {v.name}
                      <span className="ml-2 text-xs opacity-80">{formatPrice(v.price)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Stok durumu */}
          <div className="mt-6 flex items-center gap-2 text-sm">
            {outOfStock ? (
              <span className="font-medium text-destructive">
                {hasVariants ? "Bu seçenek tükendi" : "Stokta yok"}
              </span>
            ) : stock <= 5 ? (
              <span className="font-medium text-accent">Son {stock} ürün!</span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-green-700">
                <Check className="h-4 w-4" /> Stokta
              </span>
            )}
          </div>

          {/* Adet + sepet */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex h-12 items-center rounded-md border border-border">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-full w-11 items-center justify-center transition-colors hover:text-accent"
                aria-label="Azalt"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                className="flex h-full w-11 items-center justify-center transition-colors hover:text-accent"
                aria-label="Artır"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={addToCart}
              disabled={outOfStock}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              <ShoppingBag className="h-4 w-4" />
              {outOfStock ? "Tükendi" : "Sepete Ekle"}
            </button>
            <button
              onClick={() => void toggle(product.id)}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-md border transition-colors",
                fav
                  ? "border-red-200 bg-red-50 text-red-500"
                  : "border-border hover:border-accent hover:text-accent",
              )}
              aria-label="Beğendiklerime ekle"
            >
              <Heart className={cn("h-5 w-5", fav && "fill-current")} />
            </button>
          </div>

          {/* Stok bildirimi */}
          {outOfStock && !hasVariants && <StockAlertForm productId={product.id} />}

          {/* Güven şeridi */}
          <div className="mt-8 grid gap-3 rounded-md border border-border bg-card p-4 text-xs text-muted-foreground sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-accent" /> 1500 TL üzeri ücretsiz kargo
            </span>
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" /> Darbeye dayanıklı paket
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" /> 14 gün iade garantisi
            </span>
          </div>

          {/* Sekmeler */}
          <div className="mt-10">
            <div className="flex gap-6 border-b border-border text-sm">
              {(
                [
                  ["desc", "Açıklama"],
                  ["detail", "Detaylar"],
                  ["care", "Bakım"],
                  ["shipping", "Kargo & İade"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "-mb-px border-b-2 pb-3 font-medium transition-colors",
                    tab === key
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="pt-5 text-sm leading-relaxed text-muted-foreground">
              {tab === "desc" && (
                <div className="space-y-4">
                  <p>{product.description}</p>
                  {product.features && (
                    <ul className="space-y-2">
                      {product.features
                        .split("\n")
                        .map((f) => f.trim())
                        .filter(Boolean)
                        .map((f, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                            <span>{f}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
              {tab === "detail" && (
                <ul className="space-y-3">
                  {product.material && (
                    <li className="flex items-center gap-3">
                      <Star className="h-4 w-4 shrink-0 text-accent" />
                      <span>
                        <strong className="text-foreground">Malzeme:</strong> {product.material}
                      </span>
                    </li>
                  )}
                  {product.dimensions && (
                    <li className="flex items-center gap-3">
                      <Ruler className="h-4 w-4 shrink-0 text-accent" />
                      <span>
                        <strong className="text-foreground">Ölçüler:</strong> {product.dimensions}
                      </span>
                    </li>
                  )}
                  {product.color && (
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 shrink-0 text-accent" />
                      <span>
                        <strong className="text-foreground">Renk:</strong> {product.color}
                      </span>
                    </li>
                  )}
                  {product.weightKg != null && product.weightKg > 0 && (
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 shrink-0 text-accent" />
                      <span>
                        <strong className="text-foreground">Ağırlık:</strong>{" "}
                        {product.weightKg.toLocaleString("tr-TR")} kg
                      </span>
                    </li>
                  )}
                  {product.origin && (
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 shrink-0 text-accent" />
                      <span>
                        <strong className="text-foreground">Menşei:</strong> {product.origin}
                      </span>
                    </li>
                  )}
                  {product.boxContents && (
                    <li className="flex items-center gap-3">
                      <Package className="h-4 w-4 shrink-0 text-accent" />
                      <span>
                        <strong className="text-foreground">Kutu İçeriği:</strong>{" "}
                        {product.boxContents}
                      </span>
                    </li>
                  )}
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 shrink-0 text-accent" />
                    <span>Her ürünün doku ve deseni kendine özgüdür.</span>
                  </li>
                </ul>
              )}
              {tab === "care" && <p>{product.care ?? "Nemli bezle silerek temizleyiniz."}</p>}
              {tab === "shipping" && (
                <div className="space-y-3">
                  <p>
                    Siparişleriniz 1-3 iş günü içinde, darbeye dayanıklı özel
                    paketleme ile kargoya verilir. 1500 TL üzeri siparişlerde
                    kargo ücretsizdir.
                  </p>
                  <p>
                    Ürünü teslim aldıktan sonra 14 gün içinde, kullanılmamış ve
                    orijinal paketinde olmak koşuluyla iade edebilirsiniz.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Yorumlar */}
      <section className="mt-20 border-t border-border pt-12">
        <h2 className="font-display text-3xl">Değerlendirmeler</h2>
        <div className="mt-8 grid gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            {product.reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bu ürün için henüz değerlendirme yok. İlk yorumu siz yapın!
              </p>
            ) : (
              product.reviews.map((r) => (
                <div key={r.id} className="rounded-md border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-display text-sm">
                        {r.userName.charAt(0)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{r.userName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <Stars value={r.rating} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
                </div>
              ))
            )}
          </div>

          <div>
            {user ? (
              <form onSubmit={submitReview} className="rounded-md border border-border bg-card p-6">
                <h3 className="font-display text-xl">Yorum Yazın</h3>
                <div className="mt-4 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setReviewRating(i + 1)}
                      aria-label={`${i + 1} yıldız`}
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          i < reviewRating ? "fill-accent text-accent" : "text-border",
                        )}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                  minLength={3}
                  rows={4}
                  placeholder="Ürün hakkındaki düşünceleriniz..."
                  className="mt-4 w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-accent"
                />
                <button
                  disabled={reviewBusy}
                  className="mt-4 h-11 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {reviewBusy ? "Gönderiliyor..." : "Gönder"}
                </button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Yorumunuz onaylandıktan sonra yayınlanır.
                </p>
              </form>
            ) : (
              <div className="rounded-md border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Yorum yazabilmek için{" "}
                  <Link href="/giris" className="font-semibold text-accent hover:underline">
                    giriş yapın
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benzer ürünler */}
      {product.related.length > 0 && (
        <section className="mt-20 border-t border-border pt-12">
          <h2 className="font-display text-3xl">Bunlar da Hoşunuza Gidebilir</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {product.related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Son gezilenler */}
      <RecentlyViewed excludeId={product.id} />
    </div>
  )
}
