import { notFound } from "next/navigation"
import { getProductBySlug, products } from "@/lib/products"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductDetailClient } from "./product-detail-client"

type Props = {
  params: {
    slug: string
  }
}

export default function ProductDetailPage({ params }: Props) {
  const product = getProductBySlug(params.slug)

  if (!product) {
    return notFound()
  }

  const related = products.filter((p) => p.id !== product.id)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-24">
        <section className="max-w-6xl mx-auto px-6 lg:px-8">
          {/* Back button */}
          <div className="mb-8">
            <Button asChild variant="ghost" size="sm" className="rounded-full px-4 -ml-2 text-muted-foreground hover:text-foreground">
              <Link href="/urunler">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tüm ürünler
              </Link>
            </Button>
          </div>

          <div className="grid gap-10 lg:grid-cols-2 items-start">
            {/* Image */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted border border-border/40 shadow-lg shadow-primary/5">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              <span className="absolute top-5 left-5 bg-background/92 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-full">
                {product.category}
              </span>
            </div>

            {/* Info */}
            <div className="lg:pt-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium mb-3">
                {product.category}
              </p>
              <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-5 leading-tight">
                {product.name}
              </h1>
              <p className="text-muted-foreground leading-relaxed mb-7 text-base">{product.description}</p>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-7">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1 bg-muted/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-3 mb-7 pb-7 border-b border-border/50">
                <span className="font-serif text-3xl text-foreground">
                  {product.price.toLocaleString("tr-TR")} ₺
                </span>
                <span className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
                  KDV dahil
                </span>
              </div>

              {/* Add to cart (client) */}
              <ProductDetailClient product={product} />

              {/* Trust badges */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { icon: "🚚", text: "2-4 iş günü kargo" },
                  { icon: "↩️", text: "14 gün iade hakkı" },
                  { icon: "🌿", text: "Doğal malzeme" },
                ].map((badge) => (
                  <div key={badge.text} className="text-center p-3 rounded-2xl bg-muted/60 border border-border/40">
                    <div className="text-xl mb-1">{badge.icon}</div>
                    <p className="text-[11px] text-muted-foreground leading-tight">{badge.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="max-w-6xl mx-auto px-6 lg:px-8 mt-16 border-t border-border/60 pt-10">
            <header className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium mb-2">
                  Benzer ürünler
                </p>
                <h2 className="font-serif text-2xl text-foreground">Evinize uyum sağlayacak diğer parçalar</h2>
              </div>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full px-4">
                <Link href="/urunler">Tüm ürünleri gör</Link>
              </Button>
            </header>

            <div className="grid gap-6 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/urunler/${item.slug}`}
                  className="group rounded-3xl border border-border/60 bg-card/80 overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-muted">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {item.category}
                    </p>
                    <h3 className="font-serif text-sm md:text-base text-foreground line-clamp-2">{item.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.shortDescription || item.description}
                    </p>
                    <span className="mt-2 text-sm font-medium text-foreground">
                      {item.price.toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
