"use client"

import Link from "next/link"
import { ArrowRight, Gift, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useCart } from "@/components/providers"
import { api, imageUrl, type StoreSettings } from "@/lib/api"
import { formatPrice } from "@/lib/format"

export default function CartPage() {
  const { items, giftCards, subtotal, updateQuantity, removeProduct, removeGiftCard } = useCart()
  const [settings, setSettings] = useState<StoreSettings | null>(null)

  useEffect(() => {
    api<StoreSettings>("/settings", { auth: false })
      .then(setSettings)
      .catch(() => {})
  }, [])

  const empty = items.length === 0 && giftCards.length === 0
  const freeShippingGap = settings ? settings.freeShippingThreshold - subtotal : 0

  if (empty) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-32 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/40" strokeWidth={1.2} />
        <h1 className="mt-6 font-display text-3xl">Sepetiniz boş</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Koleksiyonumuzdan evinize en çok yakışacak parçaları seçin.
        </p>
        <Link
          href="/urunler"
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
        >
          Alışverişe Başla <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <h1 className="font-display text-4xl">Sepetim</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* Ücretsiz kargo çubuğu */}
          {settings && items.length > 0 && (
            <div className="rounded-md border border-border bg-card p-4">
              {freeShippingGap > 0 ? (
                <p className="text-sm">
                  <strong className="text-accent">{formatPrice(freeShippingGap)}</strong> daha
                  ekleyin, kargo <strong>ücretsiz</strong> olsun!
                </p>
              ) : (
                <p className="text-sm font-medium text-green-700">
                  Tebrikler, kargonuz ücretsiz! 🎉
                </p>
              )}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (subtotal / settings.freeShippingThreshold) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Ürünler */}
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex gap-4 rounded-md border border-border bg-card p-4"
            >
              <Link href={`/urunler/${item.slug}`} className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(item.image)}
                  alt={item.name}
                  className="h-24 w-24 rounded-md object-cover sm:h-28 sm:w-28"
                />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/urunler/${item.slug}`}
                    className="font-display text-lg leading-snug hover:text-accent"
                  >
                    {item.name}
                  </Link>
                  <button
                    onClick={() => removeProduct(item.productId)}
                    className="p-1 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Kaldır"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{formatPrice(item.price)}</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex h-9 items-center rounded-md border border-border">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="flex h-full w-9 items-center justify-center hover:text-accent"
                      aria-label="Azalt"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="flex h-full w-9 items-center justify-center hover:text-accent"
                      aria-label="Artır"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm font-bold">{formatPrice(item.price * item.quantity)}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Hediye kartları */}
          {giftCards.map((gc) => (
            <div
              key={gc.key}
              className="flex items-center gap-4 rounded-md border border-accent/40 bg-secondary/50 p-4"
            >
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md bg-primary sm:h-28 sm:w-28">
                <Gift className="h-8 w-8 text-accent" />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between">
                  <p className="font-display text-lg">Hediye Kartı</p>
                  <button
                    onClick={() => removeGiftCard(gc.key)}
                    className="p-1 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Kaldır"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {gc.recipientName && (
                  <p className="text-xs text-muted-foreground">Alıcı: {gc.recipientName}</p>
                )}
                <p className="mt-auto pt-3 text-sm font-bold">{formatPrice(gc.amount)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Özet */}
        <div className="h-fit rounded-md border border-border bg-card p-6 lg:sticky lg:top-28">
          <h2 className="font-display text-2xl">Sipariş Özeti</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Ara toplam</dt>
              <dd className="font-semibold">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Kargo</dt>
              <dd className="text-muted-foreground">Ödeme adımında hesaplanır</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-md bg-secondary/70 p-3 text-xs text-muted-foreground">
            Kupon kodu ve hediye kartınızı ödeme adımında kullanabilirsiniz.
          </p>
          <Link
            href="/odeme"
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
          >
            Ödemeye Geç <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/urunler"
            className="mt-3 block text-center text-xs font-medium text-muted-foreground hover:text-accent"
          >
            Alışverişe devam et
          </Link>
        </div>
      </div>
    </div>
  )
}
