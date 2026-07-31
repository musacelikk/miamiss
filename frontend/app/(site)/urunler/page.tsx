"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react"
import { api, type Category, type Product } from "@/lib/api"
import { ProductCard, ProductCardSkeleton } from "@/components/site/product-card"
import { cn } from "@/lib/utils"

const SORTS = [
  { value: "newest", label: "En Yeniler" },
  { value: "price-asc", label: "Fiyat: Düşükten Yükseğe" },
  { value: "price-desc", label: "Fiyat: Yüksekten Düşüğe" },
  { value: "name", label: "İsme Göre (A-Z)" },
]

function ProductsContent() {
  const router = useRouter()
  const params = useSearchParams()
  const category = params.get("category") ?? ""
  const search = params.get("search") ?? ""
  const sort = params.get("sort") ?? "newest"
  const page = parseInt(params.get("page") ?? "1", 10)

  const [categories, setCategories] = useState<Category[]>([])
  const [data, setData] = useState<{
    items: Product[]
    total: number
    pageCount: number
  } | null>(null)

  useEffect(() => {
    api<Category[]>("/categories", { auth: false })
      .then(setCategories)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setData(null)
    const q = new URLSearchParams()
    if (category) q.set("category", category)
    if (search) q.set("search", search)
    if (sort) q.set("sort", sort)
    q.set("page", String(page))
    q.set("limit", "12")
    api<{ items: Product[]; total: number; pageCount: number }>(
      `/products?${q.toString()}`,
      { auth: false },
    )
      .then(setData)
      .catch(() => setData({ items: [], total: 0, pageCount: 0 }))
  }, [category, search, sort, page])

  const setParam = (key: string, value: string | null) => {
    const q = new URLSearchParams(params.toString())
    if (value) q.set(key, value)
    else q.delete(key)
    if (key !== "page") q.delete("page")
    router.push(`/urunler?${q.toString()}`)
  }

  const activeCategory = categories.find((c) => c.slug === category)

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      {/* Başlık */}
      <div className="mb-8">
        <p className="eyebrow mb-3">Koleksiyon</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          {activeCategory?.name ?? (search ? `"${search}" için sonuçlar` : "Tüm Ürünler")}
        </h1>
        {data && (
          <p className="mt-2 text-sm text-muted-foreground">{data.total} ürün</p>
        )}
      </div>

      {/* Filtreler */}
      <div className="mb-8 flex flex-wrap items-center gap-2 border-y border-border py-4">
        <SlidersHorizontal className="mr-1 hidden h-4 w-4 text-muted-foreground sm:block" />
        <button
          onClick={() => setParam("category", null)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
            !category
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:border-accent hover:text-accent",
          )}
        >
          Tümü
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setParam("category", c.slug === category ? null : c.slug)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
              category === c.slug
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-accent hover:text-accent",
            )}
          >
            {c.name}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {search && (
            <button
              onClick={() => setParam("search", null)}
              className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs"
            >
              "{search}" <X className="h-3 w-3" />
            </button>
          )}
          <select
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium outline-none focus:border-accent"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ürün grid */}
      {data === null ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-display text-2xl">Ürün bulunamadı</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Farklı bir kategori veya arama terimi deneyin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
          {data.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* Sayfalama */}
      {data && data.pageCount > 1 && (
        <div className="mt-14 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setParam("page", String(page - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border disabled:opacity-40"
            aria-label="Önceki sayfa"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: data.pageCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setParam("page", String(i + 1))}
              className={cn(
                "h-10 w-10 rounded-md border text-sm font-medium",
                page === i + 1
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-accent",
              )}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={page >= data.pageCount}
            onClick={() => setParam("page", String(page + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border disabled:opacity-40"
            aria-label="Sonraki sayfa"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsContent />
    </Suspense>
  )
}
