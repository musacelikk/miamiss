"use client"

import { useState } from "react"
import { Heart, ShoppingBag, Minus, Plus } from "lucide-react"
import type { Product } from "@/lib/products"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-context"
import { useFavorites } from "@/components/favorites-context"
import { useRouter } from "next/navigation"

export function ProductDetailClient({ product }: { product: Product }) {
  const { addToCart } = useCart()
  const router = useRouter()
  const isLoggedIn = false
  const { isFavorite, toggleFavorite } = useFavorites()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const handleAddToCart = () => {
    addToCart(product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    addToCart(product, quantity)
    router.push("/sepet")
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Favori + Quantity/Add */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 border border-border/60 bg-background/40 hover:bg-background/60"
          aria-label="Beğen"
          onClick={() => {
            if (!isLoggedIn) {
              router.push("/giris")
              return
            }
            toggleFavorite(product)
          }}
        >
          <Heart
            className="w-4 h-4"
            fill={isFavorite(product.id) ? "currentColor" : "none"}
          />
        </Button>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Adet</span>
          <div className="inline-flex items-center gap-1 border border-border rounded-full px-2 py-1">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Azalt"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="min-w-[2rem] text-center text-sm font-medium">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Artır"
          >
            <Plus className="w-3 h-3" />
          </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          size="lg"
          className={`rounded-full w-full sm:w-auto px-8 transition-all duration-300 ${
            added ? "bg-green-600 hover:bg-green-600" : ""
          }`}
          onClick={handleAddToCart}
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          {added ? "Sepete eklendi ✓" : "Sepete ekle"}
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="rounded-full w-full sm:w-auto px-8"
          onClick={handleBuyNow}
        >
          Hemen al
        </Button>
      </div>
    </div>
  )
}
