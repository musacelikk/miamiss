import "server-only"

import { API_URL, type BlogPost } from "@/lib/api"
import {
  extractFaq,
  extractToc,
  htmlToText,
  readingMinutes,
  sanitizeBlogHtml,
  stripLeadingH1,
  type FaqEntry,
  type TocEntry,
} from "@/lib/blog-html"
import {
  getPublishedPost,
  listAllPublishedPosts,
  listPublishedPosts,
  type BlogProduceSeo,
} from "@/lib/blogproduce"
import type { BlogSource, BlogSummary, BlogTag } from "@/lib/blog-types"

export type { BlogSource, BlogSummary, BlogTag }

/**
 * Blogun tek giris noktasi: iki kaynagi birlestirir.
 *
 *  - "local"       → kendi backend'imiz (/api/blog), admin panelinden yazilir
 *  - "blogproduce" → BlogProduce API'si, yapay zeka ile uretilen yazilar
 *
 * Ayni slug iki kaynakta da varsa BlogProduce kazanir; liste ve detay ayni
 * kurali uyguladigi icin karttan acilan yazi her zaman kartla ayni icerik olur.
 */

export interface BlogDetailBase {
  source: BlogSource
  title: string
  slug: string
  excerpt: string
  coverImage: string | null
  publishedAt: string | null
  updatedAt: string | null
  author: string | null
  tags: BlogTag[]
}

/** BlogProduce yazisi: sunucuda temizlenmis HTML + icindekiler + SSS. */
export interface BlogProduceDetail extends BlogDetailBase {
  source: "blogproduce"
  html: string
  toc: TocEntry[]
  faq: FaqEntry[]
  minutes: number
  seo: BlogProduceSeo | null
}

/** Yerel yazi: mevcut davranis korunur, icerik istemcide formatina gore cizilir. */
export interface LocalBlogDetail extends BlogDetailBase {
  source: "local"
  content: string
  format: BlogPost["format"]
}

export type BlogDetail = BlogProduceDetail | LocalBlogDetail

const LOCAL_REVALIDATE = 300

async function fetchLocal<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate: LOCAL_REVALIDATE, tags: ["blog-local"] },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function localToSummary(post: BlogPost): BlogSummary {
  return {
    source: "local",
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    coverImage: post.coverImage,
    publishedAt: post.publishedAt,
    author: null,
    tags: [],
  }
}

/** Yeniden eskiye; tarihi olmayan yazilar sona. */
function byNewest(a: BlogSummary, b: BlogSummary): number {
  const at = a.publishedAt ? Date.parse(a.publishedAt) : 0
  const bt = b.publishedAt ? Date.parse(b.publishedAt) : 0
  return bt - at
}

/**
 * Blog listesi — iki kaynak paralel cekilir, slug'a gore tekillestirilir ve
 * tarihe gore harmanlanir. Bir kaynak dusarse digeri yayinda kalir.
 */
export async function getBlogIndex(): Promise<BlogSummary[]> {
  const [remote, local] = await Promise.all([
    listPublishedPosts(100),
    fetchLocal<BlogPost[]>("/blog"),
  ])

  const summaries: BlogSummary[] = remote.posts.map((post) => ({
    source: "blogproduce",
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    coverImage: post.coverImageUrl,
    publishedAt: post.publishedAt,
    author: post.author?.name ?? null,
    tags: (post.tags ?? []).map((tag) => ({ name: tag.name, slug: tag.slug })),
  }))

  const seen = new Set(summaries.map((post) => post.slug))
  for (const post of local ?? []) {
    if (seen.has(post.slug)) continue
    seen.add(post.slug)
    summaries.push(localToSummary(post))
  }

  return summaries.sort(byNewest)
}

/** Once BlogProduce, bulunamazsa yerel backend. Iki kaynakta da yoksa null. */
export async function getBlogPost(slug: string): Promise<BlogDetail | null> {
  const remote = await getPublishedPost(slug)

  if (remote) {
    const rawHtml = remote.content_html ?? ""
    const html = rawHtml ? stripLeadingH1(sanitizeBlogHtml(rawHtml)) : ""
    return {
      source: "blogproduce",
      title: remote.title,
      slug: remote.slug,
      excerpt: remote.excerpt ?? "",
      coverImage: remote.coverImageUrl,
      publishedAt: remote.publishedAt,
      updatedAt: null,
      author: remote.author?.name ?? null,
      tags: (remote.tags ?? []).map((tag) => ({ name: tag.name, slug: tag.slug })),
      html,
      toc: extractToc(html),
      faq: extractFaq(html),
      minutes: html ? readingMinutes(html) : 1,
      seo: remote.seo,
    }
  }

  const local = await fetchLocal<BlogPost>(`/blog/${encodeURIComponent(slug)}`)
  if (!local) return null

  return {
    source: "local",
    title: local.title,
    slug: local.slug,
    excerpt: local.excerpt ?? "",
    coverImage: local.coverImage,
    publishedAt: local.publishedAt,
    updatedAt: null,
    author: null,
    tags: [],
    content: local.content ?? "",
    format: local.format,
  }
}

/** Meta aciklama: ozet yoksa govdeden turetilir. */
export function blogDescription(post: BlogDetail): string {
  const source =
    post.excerpt ||
    (post.source === "blogproduce" ? htmlToText(post.html) : post.content.replace(/<[^>]+>/g, " "))
  return source.replace(/\s+/g, " ").trim().slice(0, 160)
}

/** Sitemap icin: her iki kaynaktaki tum yayinlanmis yazilarin slug + tarihi. */
export async function getAllBlogSlugs(): Promise<
  { slug: string; lastModified: Date | undefined }[]
> {
  const [remote, local] = await Promise.all([
    listAllPublishedPosts(),
    fetchLocal<BlogPost[]>("/blog"),
  ])

  const entries = new Map<string, { slug: string; lastModified: Date | undefined }>()

  for (const post of remote) {
    entries.set(post.slug, {
      slug: post.slug,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : undefined,
    })
  }
  for (const post of local ?? []) {
    if (entries.has(post.slug)) continue
    entries.set(post.slug, {
      slug: post.slug,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : undefined,
    })
  }

  return [...entries.values()]
}
