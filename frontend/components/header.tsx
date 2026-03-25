"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-context"
import { useFavorites } from "@/components/favorites-context"

const navLinks = [
  { href: "/urunler", label: "Ürünler" },
  { href: "/hediyeler", label: "Hediyeler" },
]

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const { totalItems } = useCart()
  const isLoggedIn = false
  const { favoriteIds } = useFavorites()
  const [email, setEmail] = useState("")
  const [joinStatus, setJoinStatus] = useState<"idle" | "success">("idle")
  const router = useRouter()

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Üyelik strip (navbar'ın en üstü, düz çizgi; rounded yok) */}
      <div className="w-full bg-[#ebd0bd] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-3">
          <div className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-foreground/90 font-bold whitespace-nowrap">
            Üye ol anında %5 indirim kodu kazan
          </div>
        </div>
        {joinStatus === "success" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2">
            <p className="text-[11px] text-primary-foreground/95">Teşekkürler! Demo kayıt alındı.</p>
          </div>
        )}
      </div>

      <nav className="max-w-7xl mx-auto bg-background/85 backdrop-blur-md border border-border/50 rounded-3xl shadow-lg shadow-foreground/5 mt-4">
        <div className="relative flex items-center justify-between h-16 lg:h-20 px-4 sm:px-6 lg:px-8">
          {/* Mobile logo (left) */}
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <img src="/logo/logo-b.png" alt="Mia Miss logo" className="h-10 w-auto" />
          </Link>

          {/* Desktop: sol / logo(ekran ortası) / sağ grid */}
          <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center w-full">
            {/* Desktop left: sadece menü yazıları */}
            <div className="flex items-center gap-6 lg:gap-10 justify-start min-w-0 whitespace-nowrap">
              {navLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop centered logo (gerçek ekran ortası) */}
            <Link href="/" aria-label="Ana sayfa" className="flex items-center justify-center">
              <img src="/logo/logo-b.png" alt="Mia Miss logo" className="h-10 w-auto md:h-12" />
            </Link>

            {/* Desktop right: search + giriş + sepet */}
            <div className="flex items-center justify-end gap-2">
              <div className="flex flex-row-reverse items-center gap-2">
                <div
                  className={`min-w-0 overflow-hidden transition-all duration-300 ${
                    isSearchOpen ? "max-w-64 opacity-100" : "max-w-0 opacity-0"
                  }`}
                >
                  <form
                    className="flex items-center gap-2 py-1"
                    onSubmit={(e) => {
                      e.preventDefault()
                      console.log("Arama:", searchTerm)
                    }}
                  >
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Ürün, kategori veya ilham ara"
                      className="w-32 sm:w-40 md:w-48 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Temizle
                      </button>
                    )}
                  </form>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Ara"
                  type="button"
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {isLoggedIn ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Profil"
                  type="button"
                >
                  <User className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  asChild
                  variant="ghost"
                  className="rounded-full px-4 h-9 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Link href="/giris">Giriş yap</Link>
                </Button>
              )}

              {/* Beğenilenler (giriş yoksa giriş yap sayfasına) */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Beğendiklerim"
                type="button"
                onClick={() => {
                  if (!isLoggedIn) {
                    router.push("/giris")
                    return
                  }
                  router.push("/begendiklerim")
                }}
              >
                <div className="relative">
                  <Heart
                    className="w-4 h-4"
                    fill={favoriteIds.length > 0 ? "currentColor" : "none"}
                  />
                  {favoriteIds.length > 0 && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-primary text-[10px] text-primary-foreground font-medium px-1">
                      {favoriteIds.length}
                    </span>
                  )}
                </div>
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-full px-3 h-9 border-border/60 bg-background/60 hover:bg-background text-sm"
              >
                <Link href="/sepet" className="flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" />
                  {totalItems > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-[10px] text-primary-foreground font-medium">
                      {totalItems}
                    </span>
                  )}
                </Link>
              </Button>
            </div>
          </div>

          {/* Mobile: cart + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Button asChild variant="ghost" size="sm" className="rounded-full p-2 relative">
              <Link href="/sepet">
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground font-medium">
                    {totalItems}
                  </span>
                )}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Beğendiklerim"
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  router.push("/giris")
                  return
                }
                router.push("/begendiklerim")
              }}
            >
              <div className="relative">
                <Heart className="w-4 h-4" fill={favoriteIds.length > 0 ? "currentColor" : "none"} />
                {favoriteIds.length > 0 && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground font-medium">
                    {favoriteIds.length}
                  </span>
                )}
              </div>
            </Button>
            <button
              className="p-2 rounded-xl hover:bg-muted transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Menüyü aç"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-5 px-4 sm:px-6 border-t border-border/40">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className="text-base text-muted-foreground hover:text-foreground transition-colors py-1"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full w-full mt-3">
                <Link href="/urunler" onClick={() => setIsOpen(false)}>
                  Alışveriş yap
                </Link>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
