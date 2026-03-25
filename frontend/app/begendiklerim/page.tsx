"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useFavorites } from "@/components/favorites-context"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function BegendiklerimPage() {
  const router = useRouter()
  const isLoggedIn = false
  const { favorites } = useFavorites()

  useEffect(() => {
    if (!isLoggedIn) router.replace("/giris")
  }, [isLoggedIn, router])

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-24">
        <section className="max-w-7xl mx-auto px-6 lg:px-8">
          <header className="mb-10">
            <h1 className="font-serif text-3xl md:text-4xl text-foreground flex items-center gap-3">
              <Heart className="w-6 h-6 text-primary" />
              Beğendiklerim
            </h1>
            <p className="text-muted-foreground mt-3">
              {favorites.length > 0 ? "Seçtiğiniz favori ürünler aşağıda listelenir." : "Henüz favori eklemediniz."}
            </p>
          </header>

          {favorites.length === 0 ? (
            <div className="rounded-3xl border border-border/70 bg-card/70 p-8 text-center">
              <p className="text-sm text-muted-foreground">Favorilere eklemek için ürün kartlarındaki kalbe tıklayın.</p>
              <div className="mt-5">
                <Button asChild className="rounded-full px-7">
                  <Link href="/urunler">Ürünleri keşfet</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((p) => (
                <Link
                  key={p.id}
                  href={`/urunler/${p.slug}`}
                  className="group rounded-3xl border border-border/60 bg-card/80 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-muted">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-5 space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{p.category}</p>
                    <h2 className="font-serif text-foreground line-clamp-2">{p.name}</h2>
                    <p className="text-sm font-medium">{p.price.toLocaleString("tr-TR")} ₺</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}

