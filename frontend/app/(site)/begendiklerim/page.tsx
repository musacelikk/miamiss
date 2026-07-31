"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Heart } from "lucide-react"
import { useFavorites } from "@/components/providers"
import { api, type Product } from "@/lib/api"
import { ProductCard, ProductCardSkeleton } from "@/components/site/product-card"

export default function FavoritesPage() {
  const { ids } = useFavorites()
  const [products, setProducts] = useState<Product[] | null>(null)

  useEffect(() => {
    // Tum aktif urunleri cekip favori id'lerine gore filtrele
    api<{ items: Product[] }>("/products?limit=50", { auth: false })
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]))
  }, [])

  const favorites = products?.filter((p) => ids.has(p.id)) ?? null

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <p className="eyebrow mb-3">Favoriler</p>
      <h1 className="font-display text-4xl">Beğendiklerim</h1>

      {favorites === null ? (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="py-24 text-center">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground/40" strokeWidth={1.2} />
          <p className="mt-6 font-display text-2xl">Henüz beğendiğiniz ürün yok</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ürün kartlarındaki kalp ikonuna dokunarak favorilerinizi oluşturun.
          </p>
          <Link
            href="/urunler"
            className="mt-8 inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
          >
            Koleksiyonu Keşfet
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
          {favorites.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
