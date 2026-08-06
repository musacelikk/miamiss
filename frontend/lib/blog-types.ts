/**
 * Hem sunucu hem istemci tarafinin gordugu blog tipleri.
 *
 * lib/blog.ts "server-only" oldugu icin bu tipler ayri dosyada duruyor —
 * boylece istemci bilesenleri gizli anahtar tasiyan modulu hic gormeden
 * ayni sekli kullanabiliyor.
 */

export type BlogSource = "blogproduce" | "local"

export interface BlogTag {
  name: string
  slug: string
}

export interface BlogSummary {
  source: BlogSource
  title: string
  slug: string
  excerpt: string
  coverImage: string | null
  publishedAt: string | null
  author: string | null
  tags: BlogTag[]
}
