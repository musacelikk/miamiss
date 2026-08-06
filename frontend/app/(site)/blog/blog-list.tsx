"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Search, SearchX } from "lucide-react"
import type { BlogSummary } from "@/lib/blog-types"
import { BlogCover } from "@/components/site/blog-cover"
import { cn } from "@/lib/utils"

/** Tarih sunucuda bicimlendirilir — istemcide farkli saat diliminde
 *  hidrasyon uyusmazligi olmasin diye etiket hazir gelir. */
export type BlogCard = BlogSummary & { dateLabel: string | null }

/**
 * Turkce duyarli arama normalizasyonu: "sıcak" ↔ "sicak", "ÖZEL" ↔ "ozel".
 * Once tr-TR kucultme (I→ı), sonra aksan sadelestirme.
 */
function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

const ALL = "__all__"

export function BlogList({ posts }: { posts: BlogCard[] }) {
  const [query, setQuery] = useState("")
  const [activeTag, setActiveTag] = useState(ALL)

  /** Kartlarda gecen benzersiz etiketler — hicbiri yoksa filtre cubugu gizlenir. */
  const tags = useMemo(() => {
    const map = new Map<string, string>()
    for (const post of posts) {
      for (const tag of post.tags) map.set(tag.slug, tag.name)
    }
    return [...map].map(([slug, name]) => ({ slug, name }))
  }, [posts])

  const filtered = useMemo(() => {
    const needle = normalize(query.trim())
    return posts.filter((post) => {
      if (activeTag !== ALL && !post.tags.some((tag) => tag.slug === activeTag)) {
        return false
      }
      if (!needle) return true
      const haystack = normalize(
        `${post.title} ${post.excerpt} ${post.tags.map((t) => t.name).join(" ")}`,
      )
      return haystack.includes(needle)
    })
  }, [posts, query, activeTag])

  return (
    <section className="mt-12 lg:mt-14">
      {/* Arama + etiket filtresi */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-xs">
          <span className="sr-only">Yazılarda ara</span>
          <Search
            className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Yazılarda ara…"
            className="border-border focus:border-accent focus:ring-accent/20 h-10 w-full rounded-md border bg-transparent pr-3 pl-9 text-sm transition-colors outline-none focus:ring-2"
          />
        </label>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <TagChip
              label="Tümü"
              active={activeTag === ALL}
              onClick={() => setActiveTag(ALL)}
            />
            {tags.map((tag) => (
              <TagChip
                key={tag.slug}
                label={tag.name}
                active={activeTag === tag.slug}
                onClick={() => setActiveTag(tag.slug)}
              />
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <SearchX className="text-muted-foreground/40 mx-auto h-10 w-10" strokeWidth={1.2} />
          <p className="font-display mt-5 text-xl">Aramanıza uyan yazı bulunamadı</p>
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setActiveTag(ALL)
            }}
            className="text-accent mt-3 text-sm hover:underline"
          >
            Filtreleri temizle
          </button>
        </div>
      ) : (
        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <article key={`${post.source}:${post.slug}`}>
              <Link href={`/blog/${post.slug}`} className="group block">
                <BlogCover
                  src={post.coverImage}
                  title={post.title}
                  seed={post.slug}
                  className="aspect-[3/2] rounded-md"
                />

                {post.dateLabel && (
                  <p className="text-muted-foreground mt-4 text-xs tracking-[0.15em] uppercase">
                    {post.dateLabel}
                  </p>
                )}

                <h3 className="font-display group-hover:text-accent mt-2 text-2xl leading-snug transition-colors">
                  {post.title}
                </h3>

                {post.excerpt && (
                  <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                    {post.excerpt}
                  </p>
                )}

                {post.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.slug}
                        className="bg-secondary/70 text-secondary-foreground rounded-sm px-2 py-0.5 text-[0.68rem] tracking-wide"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs tracking-wide transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-accent hover:text-accent",
      )}
    >
      {label}
    </button>
  )
}
