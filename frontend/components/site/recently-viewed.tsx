"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { History } from "lucide-react"
import { imageUrl, type Product } from "@/lib/api"
import { formatPrice } from "@/lib/format"

const KEY = "miamiss_recently_viewed"
const MAX = 12

interface ViewedItem {
  id: string
  slug: string
  name: string
  price: number
  image: string | null
}

/** Urun detayinda cagrilir; localStorage'a en basa ekler. */
export function recordView(product: Product) {
  try {
    const list: ViewedItem[] = JSON.parse(localStorage.getItem(KEY) ?? "[]")
    const next = [
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images?.[0]?.url ?? null,
      },
      ...list.filter((i) => i.id !== product.id),
    ].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* localStorage yoksa sessizce gec */
  }
}

export function RecentlyViewed({
  excludeId,
  title = "Son İnceledikleriniz",
}: {
  excludeId?: string
  title?: string
}) {
  const [items, setItems] = useState<ViewedItem[]>([])

  useEffect(() => {
    try {
      const list: ViewedItem[] = JSON.parse(localStorage.getItem(KEY) ?? "[]")
      setItems(list.filter((i) => i.id !== excludeId).slice(0, 6))
    } catch {
      /* yoksay */
    }
  }, [excludeId])

  if (items.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <History className="h-4 w-4 text-accent" />
        <h2 className="font-display text-2xl">{title}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/urunler/${item.slug}`}
            className="group w-36 shrink-0 sm:w-44"
          >
            <div className="overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(item.image)}
                alt={item.name}
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <p className="mt-2 truncate text-sm font-medium group-hover:text-accent">
              {item.name}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">
              {formatPrice(item.price)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
