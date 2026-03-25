"use client"

import Link from "next/link"
import { useCart } from "@/components/cart-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function CartPage() {
  const { items, totalItems, totalPrice, removeFromCart, clearCart, addToCart } = useCart()

  const hasItems = items.length > 0

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-40 pb-24">
        <section className="max-w-4xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <Button asChild variant="ghost" size="sm" className="rounded-full px-4 -ml-2 text-muted-foreground hover:text-foreground">
              <Link href="/urunler">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Alışverişe devam et
              </Link>
            </Button>
            {hasItems && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Sepeti temizle
              </button>
            )}
          </div>

          <header className="mb-8">
            <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-1">Sepetim</h1>
            <p className="text-muted-foreground text-sm">
              {hasItems
                ? `${totalItems} ürün seçildi`
                : "Sepetiniz henüz boş."}
            </p>
          </header>

          {!hasItems ? (
            <div className="border border-dashed border-border/60 rounded-3xl p-14 text-center bg-muted/20">
              <p className="text-4xl mb-4">🛍️</p>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed max-w-sm mx-auto">
                Henüz sepetinize ürün eklemediniz. Ev dekorasyon koleksiyonumuzu keşfedebilirsiniz.
              </p>
              <Button asChild className="rounded-full px-7">
                <Link href="/urunler">Koleksiyonu keşfet</Link>
              </Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
              {/* Cart items */}
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-4 border border-border/50 rounded-2xl p-4 bg-card shadow-sm"
                  >
                    <Link href={`/urunler/${item.product.slug}`} className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link href={`/urunler/${item.product.slug}`}>
                        <h2 className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-2">
                          {item.product.name}
                        </h2>
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5 mb-3">{item.product.category}</p>

                      <div className="flex items-center gap-1 border border-border rounded-full px-1.5 py-0.5 w-fit">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity === 1) removeFromCart(item.product.id)
                            else addToCart(item.product, -1)
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-xs font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => addToCart(item.product, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <span className="font-medium text-sm text-foreground whitespace-nowrap">
                        {(item.product.price * item.quantity).toLocaleString("tr-TR")} ₺
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Ürünü kaldır"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order summary */}
              <div className="border border-border/50 rounded-3xl p-6 bg-card shadow-sm sticky top-28">
                <h2 className="font-serif text-xl text-foreground mb-6">Sipariş özeti</h2>
                <div className="space-y-3 mb-6 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Ürünler toplamı</span>
                    <span>{totalPrice.toLocaleString("tr-TR")} ₺</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Kargo</span>
                    <span className="text-primary font-medium">Ücretsiz</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between font-medium text-foreground">
                    <span>Toplam</span>
                    <span className="text-lg">{totalPrice.toLocaleString("tr-TR")} ₺</span>
                  </div>
                </div>
                <Button className="rounded-full w-full py-5 text-base" disabled>
                  Ödemeye geç
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Ödeme entegrasyonu yakında aktif olacak
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
