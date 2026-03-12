"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, Search, ShoppingBag, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-context"

const navLinks = [
  { href: "/urunler", label: "Ürünler" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "İletişim" },
]

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const { totalItems } = useCart()
  const isLoggedIn = false

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6">
      <nav className="max-w-7xl mx-auto bg-background/85 backdrop-blur-md border border-border/50 rounded-3xl shadow-lg shadow-foreground/5">
        <div className="flex items-center justify-between h-16 lg:h-20 px-5 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo/logo-b.png" alt="Mia Miss logo" className="h-10 w-auto md:h-12" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 lg:gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop icons: search, login/profile, cart */}
          <div className="hidden md:flex items-center gap-2">
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
            <button
              className="p-2 rounded-xl hover:bg-muted transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Menüyü aç"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Search bar (opens under navbar) */}
        {isSearchOpen && (
          <div className="border-t border-border/50 bg-background/95 backdrop-blur-md px-5 lg:px-8 py-3">
            <form
              className="flex items-center gap-3 max-w-xl mx-auto"
              onSubmit={(e) => {
                e.preventDefault()
                // Şimdilik sadece konsola yazan demo davranışı
                console.log("Arama:", searchTerm)
              }}
            >
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ürün, kategori veya ilham ara"
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
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
        )}

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-5 px-5 border-t border-border/40">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
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
