import type { MetadataRoute } from "next"
import { API_URL } from "@/lib/api"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/urunler`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/hediye-karti`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/hakkimizda`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/siparis-takip`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/iade-degisim`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/mesafeli-satis`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/kvkk`, changeFrequency: "yearly", priority: 0.2 },
  ]

  try {
    const res = await fetch(`${API_URL}/products?limit=50`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return statics
    const data = (await res.json()) as {
      items: { slug: string; updatedAt: string }[]
    }
    const products: MetadataRoute.Sitemap = data.items.map((p) => ({
      url: `${SITE_URL}/urunler/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }))
    return [...statics, ...products]
  } catch {
    return statics
  }
}
