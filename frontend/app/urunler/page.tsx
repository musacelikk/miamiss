"use client"

import Link from "next/link"
import { products } from "@/lib/products"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useCart } from "@/components/cart-context"

export const dynamic = "force-static"

export default function ProductsPage() {
  const { addToCart } = useCart()
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-24">
        <section className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Page header */}
          <header className="mb-12">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium mb-3 mt-10">Koleksiyon</p>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-5 max-w-2xl">
              Evinize anlam katan parçalar
            </h1>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              Doğal dokular, sıcak tonlar ve işlevsel formlarla hazırlanan Mia Miss koleksiyonu; salon, yatak odası ve
              giriş alanlarınız için özenle küratörlük edildi.
            </p>
          </header>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2 mb-10">
            {["Tümü", "Depolama & Organizasyon", "Mobilya & Sehpalar", "Vazolar & Saksılar"].map((cat) => (
              <span
                key={cat}
                className={`text-xs px-4 py-2 rounded-full border cursor-pointer transition-colors ${
                  cat === "Tümü"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {cat}
              </span>
            ))}
          </div>

          {/* Products grid */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="group bg-card rounded-3xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:shadow-primary/8 transition-all duration-500 flex flex-col"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute top-4 left-4 bg-background/92 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-full">
                    {product.category}
                  </span>
                </div>
                <div className="p-6 lg:p-7 flex-1 flex flex-col">
                  <h2 className="font-serif text-foreground mb-2 text-xl md:text-2xl font-normal leading-snug">
                    {product.name}
                  </h2>
                  {product.shortDescription && (
                    <p className="text-muted-foreground text-sm mb-4 leading-relaxed flex-1">
                      {product.shortDescription}
                    </p>
                  )}
                  {/* Tags */}
                  {product.tags && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] text-muted-foreground bg-muted rounded-full px-2.5 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="font-medium text-xl text-foreground">
                      {product.price.toLocaleString("tr-TR")} ₺
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="rounded-full px-4"
                        onClick={() => addToCart(product, 1)}
                      >
                        Sepete ekle
                      </Button>
                      <Button asChild size="sm" variant="outline" className="rounded-full px-4">
                        <Link href={`/urunler/${product.slug}`}>İncele</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
