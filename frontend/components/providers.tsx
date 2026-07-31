"use client"

import type React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Toaster } from "@/components/ui/sonner"
import {
  api,
  getToken,
  setToken,
  type Product,
  type ProductVariant,
  type User,
} from "@/lib/api"

/* ================= Auth ================= */

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (data: {
    name: string
    email: string
    password: string
    phone?: string
  }) => Promise<User>
  loginWithToken: (token: string) => Promise<User>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth, Providers içinde kullanılmalı")
  return ctx
}

/* ================= Cart ================= */

export interface CartProductItem {
  /** Sepette benzersiz satir anahtari: urun + varyant */
  key: string
  productId: string
  variantId: string | null
  variantName: string | null
  slug: string
  name: string
  price: number
  image: string | null
  quantity: number
  stock: number
}

const lineKey = (productId: string, variantId?: string | null) =>
  variantId ? `${productId}:${variantId}` : productId

export interface CartGiftCardItem {
  key: string
  amount: number
  recipientName?: string
  recipientEmail?: string
  message?: string
}

interface CartContextValue {
  items: CartProductItem[]
  giftCards: CartGiftCardItem[]
  count: number
  subtotal: number
  addProduct: (product: Product, quantity?: number, variant?: ProductVariant | null) => void
  updateQuantity: (key: string, quantity: number) => void
  removeProduct: (key: string) => void
  addGiftCard: (item: Omit<CartGiftCardItem, "key">) => void
  removeGiftCard: (key: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart, Providers içinde kullanılmalı")
  return ctx
}

/* ================= Favorites ================= */

interface FavoritesContextValue {
  ids: Set<string>
  toggle: (productId: string) => Promise<void>
  isFavorite: (productId: string) => boolean
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error("useFavorites, Providers içinde kullanılmalı")
  return ctx
}

/* ================= Provider ================= */

const CART_KEY = "miamiss_cart"
const FAV_KEY = "miamiss_favorites"

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CartProductItem[]>([])
  const [giftCards, setGiftCards] = useState<CartGiftCardItem[]>([])
  const [favIds, setFavIds] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)

  // localStorage'dan yukle
  useEffect(() => {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) ?? "{}")
      if (Array.isArray(cart.items)) {
        // Varyant oncesi kaydedilmis sepetlerde key/variant alanlari eksik olabilir
        setItems(
          cart.items.map((i: CartProductItem) => ({
            ...i,
            key: i.key ?? lineKey(i.productId, i.variantId),
            variantId: i.variantId ?? null,
            variantName: i.variantName ?? null,
          })),
        )
      }
      if (Array.isArray(cart.giftCards)) setGiftCards(cart.giftCards)
      const favs = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]")
      if (Array.isArray(favs)) setFavIds(new Set(favs))
    } catch {
      /* bozuk veri yoksayilir */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(CART_KEY, JSON.stringify({ items, giftCards }))
  }, [items, giftCards, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(FAV_KEY, JSON.stringify([...favIds]))
  }, [favIds, hydrated])

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await api<User>("/auth/me")
      setUser(me)
      // Sunucudaki favorileri lokal ile birlestir
      try {
        const favProducts = await api<Product[]>("/users/favorites")
        setFavIds((prev) => new Set([...prev, ...favProducts.map((p) => p.id)]))
      } catch {
        /* favoriler kritik degil */
      }
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        auth: false,
      })
      setToken(res.token)
      setUser(res.user)
      void refresh()
      return res.user
    },
    [refresh],
  )

  const register = useCallback(
    async (data: { name: string; email: string; password: string; phone?: string }) => {
      const res = await api<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
        auth: false,
      })
      setToken(res.token)
      setUser(res.user)
      return res.user
    },
    [],
  )

  const loginWithToken = useCallback(
    async (token: string) => {
      setToken(token)
      const me = await api<User>("/auth/me")
      setUser(me)
      void refresh()
      return me
    },
    [refresh],
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  /* Cart actions */
  const addProduct = useCallback(
    (product: Product, quantity = 1, variant: ProductVariant | null = null) => {
      const key = lineKey(product.id, variant?.id)
      const price = variant ? variant.price : product.price
      const stock = variant ? variant.stock : product.stock

      setItems((prev) => {
        const existing = prev.find((i) => i.key === key)
        if (existing) {
          return prev.map((i) =>
            i.key === key
              ? { ...i, price, stock, quantity: Math.min(i.quantity + quantity, stock) }
              : i,
          )
        }
        return [
          ...prev,
          {
            key,
            productId: product.id,
            variantId: variant?.id ?? null,
            variantName: variant?.name ?? null,
            slug: product.slug,
            name: product.name,
            price,
            image: product.images?.[0]?.url ?? null,
            quantity: Math.min(quantity, stock),
            stock,
          },
        ]
      })
    },
    [],
  )

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) =>
            i.key === key ? { ...i, quantity: Math.min(quantity, i.stock) } : i,
          ),
    )
  }, [])

  const removeProduct = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }, [])

  const addGiftCard = useCallback((item: Omit<CartGiftCardItem, "key">) => {
    setGiftCards((prev) => [
      ...prev,
      { ...item, key: `gc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
    ])
  }, [])

  const removeGiftCard = useCallback((key: string) => {
    setGiftCards((prev) => prev.filter((g) => g.key !== key))
  }, [])

  const clear = useCallback(() => {
    setItems([])
    setGiftCards([])
  }, [])

  /* Favorites */
  const toggle = useCallback(
    async (productId: string) => {
      setFavIds((prev) => {
        const next = new Set(prev)
        if (next.has(productId)) next.delete(productId)
        else next.add(productId)
        return next
      })
      if (user) {
        try {
          await api(`/users/favorites/${productId}`, { method: "POST" })
        } catch {
          /* sunucu hatasi lokali bozmasin */
        }
      }
    },
    [user],
  )

  const cartValue = useMemo<CartContextValue>(() => {
    const subtotal =
      items.reduce((sum, i) => sum + i.price * i.quantity, 0) +
      giftCards.reduce((sum, g) => sum + g.amount, 0)
    const count =
      items.reduce((sum, i) => sum + i.quantity, 0) + giftCards.length
    return {
      items,
      giftCards,
      count,
      subtotal,
      addProduct,
      updateQuantity,
      removeProduct,
      addGiftCard,
      removeGiftCard,
      clear,
    }
  }, [items, giftCards, addProduct, updateQuantity, removeProduct, addGiftCard, removeGiftCard, clear])

  const favValue = useMemo<FavoritesContextValue>(
    () => ({
      ids: favIds,
      toggle,
      isFavorite: (id: string) => favIds.has(id),
    }),
    [favIds, toggle],
  )

  const authValue = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, loginWithToken, logout, refresh }),
    [user, loading, login, register, loginWithToken, logout, refresh],
  )

  return (
    <AuthContext.Provider value={authValue}>
      <CartContext.Provider value={cartValue}>
        <FavoritesContext.Provider value={favValue}>
          {children}
          <Toaster position="top-center" richColors />
        </FavoritesContext.Provider>
      </CartContext.Provider>
    </AuthContext.Provider>
  )
}
