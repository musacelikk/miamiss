import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, List } from "lucide-react"
import { blogDescription, getBlogPost, type BlogDetail } from "@/lib/blog"
import { readingMinutes } from "@/lib/blog-html"
import { formatDate } from "@/lib/format"
import { serializeJsonLd } from "@/lib/json-ld"
import { BlogContent } from "@/components/site/blog-content"
import { BlogCover } from "@/components/site/blog-cover"

export const revalidate = 600

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.miamisuhome.com"

const absoluteUrl = (url?: string | null) =>
  !url ? undefined : url.startsWith("http") ? url : `${SITE_URL}${url}`

function minutesOf(post: BlogDetail): number | null {
  if (post.source === "blogproduce") return post.html ? post.minutes : null
  return post.content ? readingMinutes(post.content) : null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) return { title: "Yazı Bulunamadı" }

  const seo = post.source === "blogproduce" ? post.seo : null
  const description = seo?.metaDescription || blogDescription(post)
  const image = absoluteUrl(post.coverImage)
  const url = `${SITE_URL}/blog/${post.slug}`

  return {
    title: seo?.metaTitle || post.title,
    description,
    alternates: { canonical: url },
    // BlogProduce'ta yaziya ozel robots tanimliysa ona uy (or. noindex taslaklar)
    ...(seo?.robots
      ? {
          robots: {
            index: !/noindex/i.test(seo.robots),
            follow: !/nofollow/i.test(seo.robots),
          },
        }
      : {}),
    openGraph: {
      title: seo?.ogTitle || `${post.title} | Miamisu Home`,
      description: seo?.ogDescription || description,
      url,
      type: "article",
      locale: "tr_TR",
      ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}),
      ...(post.author ? { authors: [post.author] } : {}),
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: seo?.ogTitle || post.title,
      description: seo?.ogDescription || description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) notFound()

  const minutes = minutesOf(post)
  const url = `${SITE_URL}/blog/${post.slug}`
  const description = blogDescription(post)
  const toc = post.source === "blogproduce" ? post.toc : []
  const faq = post.source === "blogproduce" ? post.faq : []

  const graph: Record<string, unknown>[] = [
    {
      "@type": "BlogPosting",
      headline: post.title,
      description: description || undefined,
      image: absoluteUrl(post.coverImage),
      url,
      datePublished: post.publishedAt ?? undefined,
      dateModified: post.updatedAt ?? post.publishedAt ?? undefined,
      inLanguage: "tr-TR",
      ...(minutes ? { timeRequired: `PT${minutes}M` } : {}),
      author: post.author
        ? { "@type": "Person", name: post.author }
        : { "@type": "Organization", name: "Miamisu Home", url: SITE_URL },
      publisher: {
        "@type": "Organization",
        name: "Miamisu Home",
        logo: { "@type": "ImageObject", url: `${SITE_URL}/logo/logo.png` },
      },
      mainEntityOfPage: url,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ]

  // Yazi sonundaki SSS bolumu varsa Google'in FAQ zengin sonuclari icin isaretle
  if (faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map((entry) => ({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: { "@type": "Answer", text: entry.answer },
      })),
    })
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({ "@context": "https://schema.org", "@graph": graph }),
        }}
      />

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <Link
          href="/blog"
          className="text-muted-foreground hover:text-accent inline-flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Tüm yazılar
        </Link>

        <header className="mt-8">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tracking-[0.2em] uppercase">
            {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
            {minutes !== null && (
              <>
                <span aria-hidden className="text-border">
                  ·
                </span>
                <span>{minutes} dk okuma</span>
              </>
            )}
            {post.author && (
              <>
                <span aria-hidden className="text-border">
                  ·
                </span>
                <span>{post.author}</span>
              </>
            )}
          </div>

          <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">{post.title}</h1>

          {post.excerpt && (
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed italic">
              {post.excerpt}
            </p>
          )}

          {post.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag.slug}
                  className="bg-secondary text-secondary-foreground rounded-sm px-2.5 py-1 text-[0.7rem] tracking-wide"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </header>

        <BlogCover
          src={post.coverImage}
          title={post.title}
          seed={post.slug}
          priority
          className="mt-8 aspect-[16/9] rounded-md"
        />

        {/* İçindekiler — yalnızca birkaç başlıktan fazlası varsa anlamlı */}
        {toc.length >= 3 && (
          <nav
            aria-label="İçindekiler"
            className="border-border bg-secondary/40 mt-10 rounded-md border p-5"
          >
            <p className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
              <List className="h-3.5 w-3.5" aria-hidden /> İçindekiler
            </p>
            <ol className="mt-3 space-y-1.5 text-sm">
              {toc.map((entry) => (
                <li key={entry.id} className={entry.level === 3 ? "pl-4" : undefined}>
                  <a
                    href={`#${entry.id}`}
                    className="text-foreground/80 hover:text-accent transition-colors"
                  >
                    {entry.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mt-10">
          {post.source === "blogproduce" ? (
            /* İçerik lib/blog-html.ts içinde allowlist ile sanitize edildi */
            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: post.html }}
            />
          ) : (
            <BlogContent content={post.content} format={post.format} />
          )}
        </div>

        <div className="bg-secondary/60 mt-14 rounded-md p-8 text-center">
          <p className="font-display text-2xl">Koleksiyonumuzu keşfettiniz mi?</p>
          <Link
            href="/urunler"
            className="bg-primary text-primary-foreground hover:bg-accent mt-4 inline-flex h-11 items-center rounded-md px-8 text-sm font-semibold transition-colors"
          >
            Ürünlere Göz At
          </Link>
        </div>
      </article>
    </>
  )
}
