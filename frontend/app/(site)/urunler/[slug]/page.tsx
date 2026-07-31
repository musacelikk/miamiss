import type { Metadata } from "next"
import { API_URL } from "@/lib/api"
import { ProductDetailClient } from "./product-detail-client"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

interface ApiProduct {
  name: string
  slug: string
  description: string
  price: number
  stock: number
  images: { url: string }[]
  category?: { name: string } | null
  avgRating?: number | null
  reviewCount?: number
}

async function fetchProduct(slug: string): Promise<ApiProduct | null> {
  try {
    const res = await fetch(`${API_URL}/products/${slug}?track=0`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    return (await res.json()) as ApiProduct
  } catch {
    return null
  }
}

const absoluteImage = (url?: string) =>
  !url ? undefined : url.startsWith("http") ? url : `${SITE_URL}${url}`

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await fetchProduct(slug)
  if (!product) return { title: "Ürün Bulunamadı" }

  const description = product.description.slice(0, 160)
  const image = absoluteImage(product.images?.[0]?.url)
  return {
    title: product.name,
    description,
    alternates: { canonical: `${SITE_URL}/urunler/${slug}` },
    openGraph: {
      title: `${product.name} | Miamisu Home`,
      description,
      url: `${SITE_URL}/urunler/${slug}`,
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await fetchProduct(slug)

  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: product.images?.map((i) => absoluteImage(i.url)).filter(Boolean),
        url: `${SITE_URL}/urunler/${slug}`,
        ...(product.category ? { category: product.category.name } : {}),
        offers: {
          "@type": "Offer",
          priceCurrency: "TRY",
          price: product.price,
          availability:
            product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          url: `${SITE_URL}/urunler/${slug}`,
        },
        ...(product.avgRating && product.reviewCount
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: product.avgRating,
                reviewCount: product.reviewCount,
              },
            }
          : {}),
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
      <ProductDetailClient slug={slug} />
    </>
  )
}
