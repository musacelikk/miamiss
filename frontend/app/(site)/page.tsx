import {
  API_URL,
  DEFAULT_HOMEPAGE,
  type Category,
  type HomepageSettings,
  type Product,
} from "@/lib/api"
import { HomeClient } from "./home-client"

/** Anasayfa verisi 5 dakikada bir tazelenir; ziyaretçiye hazır HTML gider. */
export const revalidate = 300

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export default async function HomePage() {
  const [settings, products, cats] = await Promise.all([
    fetchJson<HomepageSettings>("/settings/homepage"),
    fetchJson<{ items: Product[] }>("/products?featured=true&limit=8"),
    fetchJson<Category[]>("/categories"),
  ])

  const hp = { ...DEFAULT_HOMEPAGE, ...(settings ?? {}) }
  const categories = (cats ?? [])
    .filter((c) => c.showOnHomepage !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 5)

  return <HomeClient hp={hp} featured={products?.items ?? []} categories={categories} />
}
