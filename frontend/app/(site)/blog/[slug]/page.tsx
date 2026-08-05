import type { Metadata } from "next"
import { API_URL } from "@/lib/api"
import { BlogDetailClient } from "./blog-detail-client"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.miamisuhome.com"

interface ApiPost {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string | null
  publishedAt: string | null
  updatedAt?: string
}

async function fetchPost(slug: string): Promise<ApiPost | null> {
  try {
    const res = await fetch(`${API_URL}/blog/${slug}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return (await res.json()) as ApiPost
  } catch {
    return null
  }
}

const absoluteImage = (url?: string | null) =>
  !url ? undefined : url.startsWith("http") ? url : `${SITE_URL}${url}`

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await fetchPost(slug)
  if (!post) return { title: "Yazı Bulunamadı" }

  const description = (post.excerpt || post.content.replace(/<[^>]+>/g, "")).slice(0, 160)
  const image = absoluteImage(post.coverImage)
  return {
    title: post.title,
    description,
    alternates: { canonical: `${SITE_URL}/blog/${slug}` },
    openGraph: {
      title: `${post.title} | Miamisu Home`,
      description,
      url: `${SITE_URL}/blog/${slug}`,
      type: "article",
      ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}),
      ...(image ? { images: [{ url: image }] } : {}),
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await fetchPost(slug)

  const jsonLd = post
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt || undefined,
        image: absoluteImage(post.coverImage),
        url: `${SITE_URL}/blog/${slug}`,
        datePublished: post.publishedAt ?? undefined,
        dateModified: post.updatedAt ?? post.publishedAt ?? undefined,
        inLanguage: "tr-TR",
        author: { "@type": "Organization", name: "Miamisu Home", url: SITE_URL },
        publisher: {
          "@type": "Organization",
          name: "Miamisu Home",
          logo: { "@type": "ImageObject", url: `${SITE_URL}/logo/logo.png` },
        },
        mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <BlogDetailClient slug={slug} />
    </>
  )
}
