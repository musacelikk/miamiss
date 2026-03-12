"use client"

import { useState } from "react"
import { ShoppingBag, Minus, Plus } from "lucide-react"
import type { Product } from "@/lib/products"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-context"

export function ProductDetailClient({ product }: { product: Product }) {
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const handleAddToCart = () => {
    addToCart(product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Quantity selector */}
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

      {/* Add to cart button */}
      <Button
        size="lg"
        className={`rounded-full px-8 transition-all duration-300 ${added ? "bg-green-600 hover:bg-green-600" : ""}`}
        onClick={handleAddToCart}
      >
        <ShoppingBag className="w-4 h-4 mr-2" />
        {added ? "Sepete eklendi ✓" : "Sepete ekle"}
      </Button>
    </div>
  )
}
