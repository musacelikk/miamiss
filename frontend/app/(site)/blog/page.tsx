import Link from "next/link"
import { ArrowRight, Newspaper } from "lucide-react"
import { getBlogIndex, getBlogPost } from "@/lib/blog"
import { readingMinutes } from "@/lib/blog-html"
import { formatDate } from "@/lib/format"
import { serializeJsonLd } from "@/lib/json-ld"
import { BlogCover } from "@/components/site/blog-cover"
import { BlogList, type BlogCard } from "./blog-list"

/** Yazilar ISR ile tazelenir — her istekte API'ye gidilmez. */
export const revalidate = 600

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.miamisuhome.com"

/**
 * One cikan yazinin okuma suresi icin tek bir detay istegi yapiyoruz.
 * Liste ucu govdeyi dondurmedigi icin kart izgarasinda okuma suresi yok;
 * hero'da ise bilgi degerli oldugu icin bu ek istege degiyor. Istek
 * basarisiz olursa sure gosterilmez, sayfa calismaya devam eder.
 */
async function featuredMinutes(slug: string): Promise<number | null> {
  const detail = await getBlogPost(slug)
  if (!detail) return null
  if (detail.source === "blogproduce") return detail.html ? detail.minutes : null
  return detail.content ? readingMinutes(detail.content) : null
}

export default async function BlogPage() {
  const posts = await getBlogIndex()
  const [featured, ...rest] = posts
  const minutes = featured ? await featuredMinutes(featured.slug) : null

  const cards: BlogCard[] = rest.map((post) => ({
    ...post,
    dateLabel: post.publishedAt ? formatDate(post.publishedAt) : null,
  }))

  const itemListJsonLd = posts.length
    ? {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "Miamisu Home Blog",
        url: `${SITE_URL}/blog`,
        inLanguage: "tr-TR",
        blogPost: posts.slice(0, 20).map((post) => ({
          "@type": "BlogPosting",
          headline: post.title,
          url: `${SITE_URL}/blog/${post.slug}`,
          ...(post.excerpt ? { description: post.excerpt } : {}),
          ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
        })),
      }
    : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }}
        />
      )}

      <header className="text-center">
        <p className="eyebrow mb-3">Blog &amp; Haberler</p>
        <h1 className="font-display text-4xl sm:text-5xl">Taştan Hikâyeler</h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm leading-relaxed">
          Doğal taş bakımı, dekorasyon fikirleri ve Miamisu Home&apos;dan haberler.
        </p>
      </header>

      {!featured ? (
        <div className="py-24 text-center">
          <Newspaper
            className="text-muted-foreground/40 mx-auto h-12 w-12"
            strokeWidth={1.2}
          />
          <p className="font-display mt-6 text-2xl">Henüz yazı yayınlanmadı</p>
          <p className="text-muted-foreground mt-2 text-sm">Çok yakında burada olacağız.</p>
        </div>
      ) : (
        <>
          {/* Öne çıkan yazı — asimetrik editoryal düzen */}
          <Link
            href={`/blog/${featured.slug}`}
            className="group mt-14 grid items-center gap-8 lg:mt-16 lg:grid-cols-12 lg:gap-12"
          >
            <BlogCover
              src={featured.coverImage}
              title={featured.title}
              seed={featured.slug}
              priority
              className="aspect-[4/3] rounded-md lg:col-span-7"
            />

            <div className="flex flex-col justify-center lg:col-span-5">
              <p className="eyebrow">Öne Çıkan</p>
              <h2 className="font-display group-hover:text-accent mt-3 text-3xl leading-[1.15] transition-colors sm:text-4xl">
                {featured.title}
              </h2>

              {featured.excerpt && (
                <p className="text-muted-foreground mt-4 line-clamp-3 text-[0.95rem] leading-relaxed">
                  {featured.excerpt}
                </p>
              )}

              <div className="text-muted-foreground mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tracking-[0.12em] uppercase">
                {featured.publishedAt && <span>{formatDate(featured.publishedAt)}</span>}
                {minutes !== null && (
                  <>
                    <span aria-hidden className="text-border">
                      ·
                    </span>
                    <span>{minutes} dk okuma</span>
                  </>
                )}
                {featured.author && (
                  <>
                    <span aria-hidden className="text-border">
                      ·
                    </span>
                    <span>{featured.author}</span>
                  </>
                )}
              </div>

              {featured.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {featured.tags.map((tag) => (
                    <span
                      key={tag.slug}
                      className="bg-secondary text-secondary-foreground rounded-sm px-2.5 py-1 text-[0.7rem] tracking-wide"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <span className="text-accent mt-6 inline-flex items-center gap-2 text-sm font-medium">
                Yazıyı oku
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

          {cards.length > 0 && (
            <>
              <hr className="border-border/70 mt-16 lg:mt-20" />
              <BlogList posts={cards} />
            </>
          )}
        </>
      )}
    </div>
  )
}
