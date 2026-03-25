"use client"

import { createContext, useContext, useMemo, useState } from "react"
import type { Product } from "@/lib/products"
import { products as allProducts } from "@/lib/products"

type FavoritesContextValue = {
  favoriteIds: string[]
  isFavorite: (productId: string) => boolean
  toggleFavorite: (product: Product) => void
  favorites: Product[]
  clearFavorites: () => void
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  const isFavorite = (productId: string) => favoriteIds.includes(productId)

  const toggleFavorite = (product: Product) => {
    setFavoriteIds((prev) => {
      const exists = prev.includes(product.id)
      if (exists) return prev.filter((id) => id !== product.id)
      return [...prev, product.id]
    })
  }

  const clearFavorites = () => setFavoriteIds([])

  const favorites = useMemo(() => {
    const idSet = new Set(favoriteIds)
    return allProducts.filter((p) => idSet.has(p.id))
  }, [favoriteIds])

  const value: FavoritesContextValue = {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    favorites,
    clearFavorites,
  }

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider")
  return ctx
}

