"use client"

import { createContext, useContext, useMemo, useState } from "react"
import type { Product } from "@/lib/products"

type CartItem = {
  product: Product
  quantity: number
}

type CartContextValue = {
  items: CartItem[]
  addToCart: (product: Product, quantity?: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addToCart = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
        )
      }
      return [...prev, { product, quantity }]
    })
  }

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const clearCart = () => setItems([])

  const { totalItems, totalPrice } = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc.totalItems += item.quantity
          acc.totalPrice += item.product.price * item.quantity
          return acc
        },
        { totalItems: 0, totalPrice: 0 },
      ),
    [items],
  )

  const value: CartContextValue = {
    items,
    addToCart,
    removeFromCart,
    clearCart,
    totalItems,
    totalPrice,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider")
  }
  return ctx
}

