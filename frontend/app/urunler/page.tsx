"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { products } from "@/lib/products"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useCart } from "@/components/cart-context"

export default function ProductsPage() {
  const { addToCart } = useCart()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-24">
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Page header */}
          <header className="mb-8 sm:mb-12 mt-4 sm:mt-0">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium mb-2 mt-6 sm:mt-10">Koleksiyon</p>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-foreground mb-3 sm:mb-5 max-w-2xl">
              Evinize anlam katan parçalar
            </h1>
            <p className="hidden sm:block text-muted-foreground max-w-2xl leading-relaxed">
              Doğal dokular, sıcak tonlar ve işlevsel formlarla hazırlanan Mia Miss koleksiyonu; salon, yatak odası ve
              giriş alanlarınız için özenle küratörlük edildi.
            </p>
          </header>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2 mb-6 sm:mb-10">
            {["Tümü", "Depolama & Organizasyon", "Mobilya & Sehpalar", "Vazolar & Saksılar"].map((cat) => (
              <span
                key={cat}
                className={`text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border cursor-pointer transition-colors ${
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
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="group flex flex-col">

                {/* --- MOBİL KART (sm altı) --- */}
                <div className="sm:hidden bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm flex flex-col">
                  {/* Resim — tıklayınca detaya gider */}
                  <Link href={`/urunler/${product.slug}`} className="block relative aspect-square overflow-hidden bg-muted">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  {/* Alt kısım */}
                  <div className="p-2.5 flex flex-col gap-1.5">
                    <Link href={`/urunler/${product.slug}`}>
                      <h2 className="font-serif text-foreground text-xs leading-snug line-clamp-2">
                        {product.name}
                      </h2>
                    </Link>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="font-medium text-sm text-foreground">
                        {product.price.toLocaleString("tr-TR")} ₺
                      </span>
                      <button
                        type="button"
                        onClick={() => addToCart(product, 1)}
                        className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors flex-shrink-0"
                        aria-label="Sepete ekle"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* --- TABLET/DESKTOP KART (sm ve üzeri) --- */}
                <div className="hidden sm:flex bg-card rounded-3xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:shadow-primary/8 transition-all duration-500 flex-col h-full">
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
                    <h2 className="font-serif text-foreground mb-2 text-lg md:text-2xl font-normal leading-snug">
                      {product.name}
                    </h2>
                    {product.shortDescription && (
                      <p className="text-muted-foreground text-sm mb-4 leading-relaxed flex-1">
                        {product.shortDescription}
                      </p>
                    )}
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
                      <span className="font-medium text-lg md:text-xl text-foreground">
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
