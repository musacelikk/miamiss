import type { MetadataRoute } from "next"
import { API_URL } from "@/lib/api"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.miamisuhome.com"

export const revalidate = 3600

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/urunler`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/hediye-karti`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/hakkimizda`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/destek`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/siparis-takip`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/iade-degisim`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/mesafeli-satis`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/on-bilgilendirme`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/uyelik-sozlesmesi`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/kvkk`, changeFrequency: "yearly", priority: 0.2 },
  ]

  // Kategoriler
  const categories = await fetchJson<{ slug: string }[]>(`${API_URL}/categories`)
  const categoryUrls: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${SITE_URL}/urunler?category=${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }))

  // Tüm ürünler (sayfalanarak — backend sayfa başına en fazla 50 döner)
  const products: MetadataRoute.Sitemap = []
  for (let page = 1; page <= 20; page++) {
    const data = await fetchJson<{
      items: { slug: string; updatedAt: string }[]
      pageCount: number
    }>(`${API_URL}/products?limit=50&page=${page}`)
    if (!data?.items?.length) break
    products.push(
      ...data.items.map((p) => ({
        url: `${SITE_URL}/urunler/${p.slug}`,
        lastModified: new Date(p.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    )
    if (page >= (data.pageCount ?? 1)) break
  }

  // Blog yazıları
  const posts = await fetchJson<{ slug: string; publishedAt: string | null }[]>(
    `${API_URL}/blog`,
  )
  const blogUrls: MetadataRoute.Sitemap = (posts ?? []).map((b) => ({
    url: `${SITE_URL}/blog/${b.slug}`,
    lastModified: b.publishedAt ? new Date(b.publishedAt) : undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }))

  return [...statics, ...categoryUrls, ...products, ...blogUrls]
}
