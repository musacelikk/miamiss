import "server-only"

/**
 * BlogProduce icerik API'si — https://api.blogproduce.com
 *
 * Gizli anahtar (bg_secret_...) yalnizca sunucuda kullanilir. Bu dosya
 * "server-only" ile isaretli: bir client component yanlislikla import ederse
 * build hata verir, anahtar tarayici paketine sizmaz.
 *
 * Kullanilan uclar:
 *   GET /api/v1/published           → yayindaki yazilar (cursor sayfalama)
 *   GET /api/v1/published/{slug}    → tek yazi (?format=html ile content_html)
 */

const BASE_URL = (
  process.env.BLOGPRODUCE_API_URL ?? "https://api.blogproduce.com"
).replace(/\/+$/, "")

const API_KEY = process.env.BLOGPRODUCE_API_KEY ?? ""

/** Anahtar tanimli degilse entegrasyon sessizce devre disi kalir (build kirilmaz). */
export const BLOGPRODUCE_ENABLED = API_KEY.length > 0

/** Yanit onbellek suresi (saniye). ISR ile sayfalar bu araliklarla tazelenir. */
const REVALIDATE = Number(process.env.BLOGPRODUCE_REVALIDATE ?? 600)

/** Tek istegin bekleyecegi azami sure — dis servis takilirsa render kilitlenmesin. */
const TIMEOUT_MS = 10_000

/** Cursor ile donulecek azami sayfa — sonsuz dongu emniyeti. */
const MAX_PAGES = 20

export interface BlogProduceTag {
  id: string
  name: string
  slug: string
}

export interface BlogProduceListItem {
  id: string
  title: string
  slug: string
  excerpt: string | null
  language: string | null
  coverImageUrl: string | null
  publishedAt: string | null
  author: { name: string } | null
  tags: BlogProduceTag[]
}

/** post_seo tablosundan gelir; API'den uretilen yazilarda null olabilir. */
export interface BlogProduceSeo {
  metaTitle?: string | null
  metaDescription?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  robots?: string | null
  schemaJsonld?: Record<string, unknown> | null
}

export interface BlogProducePost extends BlogProduceListItem {
  content: string | null
  contentFormat: string | null
  /** Formattan bagimsiz olarak her zaman doner. Sanitize EDILMEMISTIR. */
  content_html: string | null
  coverImageCreditJson: { name?: string; url?: string; source?: string } | null
  seo: BlogProduceSeo | null
}

interface Envelope<T> {
  success: boolean
  data: T
}

/**
 * Next data cache'i korumak icin fetch'e AbortSignal gecmiyoruz; bunun yerine
 * yarisi zaman asimina birakiyoruz. Boylece yanit onbelleklenmeye devam eder
 * ama yavas bir API render'i kilitlemez.
 */
async function request<T>(path: string, revalidate = REVALIDATE): Promise<T | null> {
  if (!BLOGPRODUCE_ENABLED) return null

  const call = fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
    next: { revalidate, tags: ["blogproduce"] },
  })
  // Yarista kaybeden istek arkada kalirsa unhandled rejection uretmesin
  call.catch(() => {})

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const res = await Promise.race([
      call,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), TIMEOUT_MS)
      }),
    ])

    if (!res) {
      console.error(`[blogproduce] zaman asimi (${TIMEOUT_MS}ms): ${path}`)
      return null
    }
    if (!res.ok) {
      // 404 normaldir (olmayan slug) — gurultu yapma
      if (res.status !== 404) {
        console.error(`[blogproduce] ${res.status} ${res.statusText}: ${path}`)
      }
      return null
    }

    const body = (await res.json()) as Envelope<T>
    return body?.data ?? null
  } catch (error) {
    console.error(`[blogproduce] istek basarisiz: ${path}`, error)
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Yayindaki yazilarin tek sayfasi. */
export async function listPublishedPosts(
  limit = 50,
  cursor?: string,
): Promise<{ posts: BlogProduceListItem[]; cursor: string | null; hasMore: boolean }> {
  const params = new URLSearchParams({ limit: String(Math.min(limit, 100)) })
  if (cursor) params.set("cursor", cursor)

  const data = await request<{
    posts: BlogProduceListItem[]
    cursor: string | null
    hasMore: boolean
  }>(`/api/v1/published?${params}`)

  return {
    posts: data?.posts ?? [],
    cursor: data?.cursor ?? null,
    hasMore: data?.hasMore ?? false,
  }
}

/** Cursor'u sonuna kadar takip ederek yayindaki tum yazilari toplar (sitemap icin). */
export async function listAllPublishedPosts(): Promise<BlogProduceListItem[]> {
  const all: BlogProduceListItem[] = []
  let cursor: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const { posts, cursor: next, hasMore } = await listPublishedPosts(100, cursor)
    all.push(...posts)
    if (!hasMore || !next) break
    cursor = next
  }

  return all
}

/** Tek yazi — HTML govde, SEO alanlari ve etiketlerle birlikte. */
export async function getPublishedPost(slug: string): Promise<BlogProducePost | null> {
  return request<BlogProducePost>(
    `/api/v1/published/${encodeURIComponent(slug)}?format=html`,
  )
}
