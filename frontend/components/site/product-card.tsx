"use client"

import Link from "next/link"
import { Heart, Plus } from "lucide-react"
import { toast } from "sonner"
import { useCart, useFavorites } from "@/components/providers"
import { imageUrl, productDisplay, type Product } from "@/lib/api"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

export function ProductCard({ product }: { product: Product }) {
  const { addProduct } = useCart()
  const { isFavorite, toggle } = useFavorites()
  const fav = isFavorite(product.id)
  const cover = product.images?.[0]?.url
  const hover = product.images?.[1]?.url
  const { hasVariants, minPrice, maxPrice, compareAtPrice, stock } = productDisplay(product)
  const outOfStock = stock <= 0

  // Varyantli urunlerde secim gerektigi icin hizli ekleme yerine detaya yonlendirilir
  const add = (e: React.MouseEvent) => {
    if (hasVariants) return
    e.preventDefault()
    if (outOfStock) return
    addProduct(product)
    toast.success(`${product.name} sepete eklendi`)
  }

  return (
    <Link
      href={`/urunler/${product.slug}`}
      className="group relative block"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl(cover)}
          alt={product.name}
          className={cn(
            "h-full w-full object-cover transition-all duration-700 group-hover:scale-[1.04]",
            hover && "group-hover:opacity-0",
          )}
          loading="lazy"
        />
        {hover && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl(hover)}
            alt={product.name}
            className="absolute inset-0 h-full w-full scale-[1.04] object-cover opacity-0 transition-all duration-700 group-hover:opacity-100"
            loading="lazy"
          />
        )}

        {/* Rozetler */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {compareAtPrice && compareAtPrice > minPrice && (
            <span className="rounded-sm bg-accent px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
              %{Math.round((1 - minPrice / compareAtPrice) * 100)} indirim
            </span>
          )}
          {outOfStock && (
            <span className="rounded-sm bg-foreground/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-background">
              Tükendi
            </span>
          )}
        </div>

        {/* Favori */}
        <button
          onClick={(e) => {
            e.preventDefault()
            void toggle(product.id)
          }}
          aria-label="Beğendiklerime ekle"
          className={cn(
            "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur transition-all hover:scale-110",
            fav ? "text-red-500" : "text-foreground/60",
          )}
        >
          <Heart className={cn("h-4 w-4", fav && "fill-current")} />
        </button>

        {/* Hızlı ekle */}
        {!outOfStock && (
          <button
            onClick={add}
            className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-all duration-300 hover:bg-accent group-hover:translate-y-0 group-hover:opacity-100"
            aria-label="Sepete ekle"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 space-y-1 px-0.5">
        {product.category && (
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            {product.category.name}
          </p>
        )}
        <h3 className="font-display text-lg leading-snug transition-colors group-hover:text-accent">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">
            {hasVariants && maxPrice > minPrice && (
              <span className="mr-1 text-xs font-normal text-muted-foreground">başlangıç</span>
            )}
            {formatPrice(minPrice)}
          </span>
          {compareAtPrice && compareAtPrice > minPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] rounded-md bg-muted" />
      <div className="mt-3 space-y-2 px-0.5">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
    </div>
  )
}
