"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Newspaper } from "lucide-react"
import { api, type BlogPost } from "@/lib/api"
import { formatDate } from "@/lib/format"

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null)

  useEffect(() => {
    api<BlogPost[]>("/blog", { auth: false })
      .then(setPosts)
      .catch(() => setPosts([]))
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
      <div className="text-center">
        <p className="eyebrow mb-3">Blog & Haberler</p>
        <h1 className="font-display text-4xl sm:text-5xl">Taştan Hikâyeler</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Doğal taş bakımı, dekorasyon fikirleri ve Miamisu Home'dan haberler.
        </p>
      </div>

      {posts === null ? (
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[16/9] rounded-md bg-muted" />
              <div className="mt-3 h-5 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-4 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-24 text-center">
          <Newspaper className="mx-auto h-12 w-12 text-muted-foreground/40" strokeWidth={1.2} />
          <p className="mt-6 font-display text-2xl">Henüz yazı yayınlanmadı</p>
          <p className="mt-2 text-sm text-muted-foreground">Çok yakında burada olacağız.</p>
        </div>
      ) : (
        <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
              <div className="overflow-hidden rounded-md bg-muted">
                {post.coverImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center bg-secondary">
                    <Newspaper className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              {post.publishedAt && (
                <p className="mt-4 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  {formatDate(post.publishedAt)}
                </p>
              )}
              <h2 className="mt-2 font-display text-2xl leading-snug transition-colors group-hover:text-accent">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
