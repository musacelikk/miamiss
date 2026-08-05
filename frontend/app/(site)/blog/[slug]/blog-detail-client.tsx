"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { api, type BlogPost } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { BlogContent } from "@/components/site/blog-content"

export function BlogDetailClient({ slug }: { slug: string }) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    api<BlogPost>(`/blog/${slug}`, { auth: false })
      .then(setPost)
      .catch(() => setNotFound(true))
  }, [slug])

  if (notFound) {
    return (
      <div className="py-32 text-center">
        <p className="font-display text-3xl">Yazı bulunamadı</p>
        <Link href="/blog" className="mt-4 inline-block text-sm text-accent hover:underline">
          Blog'a dön
        </Link>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Tüm yazılar
      </Link>

      {post.publishedAt && (
        <p className="mt-8 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {formatDate(post.publishedAt)}
        </p>
      )}
      <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{post.title}</h1>
      {post.excerpt && (
        <p className="mt-4 text-lg italic leading-relaxed text-muted-foreground">{post.excerpt}</p>
      )}

      {post.coverImage && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.coverImage}
          alt={post.title}
          className="mt-8 aspect-[16/9] w-full rounded-md object-cover"
        />
      )}

      <div className="mt-10">
        <BlogContent content={post.content} format={post.format} />
      </div>

      <div className="mt-14 rounded-md bg-secondary/60 p-8 text-center">
        <p className="font-display text-2xl">Koleksiyonumuzu keşfettiniz mi?</p>
        <Link
          href="/urunler"
          className="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
        >
          Ürünlere Göz At
        </Link>
      </div>
    </article>
  )
}
