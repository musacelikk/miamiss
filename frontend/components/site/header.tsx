"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Heart,
  Menu,
  PackageSearch,
  Search,
  ShoppingBag,
  User as UserIcon,
  X,
} from "lucide-react"
import { useAuth, useCart } from "@/components/providers"
import { Logo } from "@/components/logo"
import { api, type StoreSettings } from "@/lib/api"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/urunler", label: "Koleksiyon" },
  { href: "/hediye-karti", label: "Hediye Kartı" },
  { href: "/hakkimizda", label: "Hakkımızda" },
]

export function SiteHeader({ heroOverlay = false }: { heroOverlay?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { count } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [announcement, setAnnouncement] = useState<{ text: string; url: string } | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    api<StoreSettings>("/settings", { auth: false })
      .then((s) =>
        setAnnouncement(
          s.announcement ? { text: s.announcement, url: s.announcementUrl ?? "" } : null,
        ),
      )
      .catch(() => {})
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setSearchOpen(false)
  }, [pathname])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/urunler?search=${encodeURIComponent(query.trim())}`)
    setSearchOpen(false)
    setQuery("")
  }

  /* Anasayfada tam ekran hero varsa header akıştan çıkar, videonun üstüne biner */
  const overlayMode = heroOverlay && pathname === "/"
  /* Sayfa başındayken tamamen saydam — video arkada kesintisiz görünür */
  const transparent = overlayMode && !scrolled && !searchOpen

  const onDark = "text-white/90 hover:text-white [filter:drop-shadow(0_1px_3px_rgb(0_0_0/0.45))]"
  const onLight = "text-foreground/80 hover:text-foreground"
  const iconClass = transparent ? onDark : onLight

  return (
    <header className={cn("z-50", overlayMode ? "fixed inset-x-0 top-0" : "sticky top-0")}>
      {announcement &&
        (announcement.url ? (
          <Link
            href={announcement.url}
            className={cn(
              "block text-primary-foreground transition-colors",
              transparent ? "bg-primary/55 backdrop-blur-sm" : "bg-primary hover:bg-primary/90",
            )}
          >
            <p className="mx-auto max-w-7xl px-4 py-2 text-center text-xs font-medium tracking-wide underline-offset-2 hover:underline">
              {announcement.text}
            </p>
          </Link>
        ) : (
          <div
            className={cn(
              "text-primary-foreground transition-colors",
              transparent ? "bg-primary/55 backdrop-blur-sm" : "bg-primary",
            )}
          >
            <p className="mx-auto max-w-7xl px-4 py-2 text-center text-xs font-medium tracking-wide">
              {announcement.text}
            </p>
          </div>
        ))}

      <div
        className={cn(
          "border-b transition-all duration-300",
          transparent
            ? "border-transparent bg-transparent"
            : scrolled
              ? "border-border bg-background/90 shadow-[0_1px_20px_rgba(60,50,35,0.06)] backdrop-blur-xl"
              : "border-transparent bg-background",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
          {/* Mobil menü */}
          <button
            className={cn("-ml-2 p-2 transition-colors lg:hidden", iconClass)}
            onClick={() => setMobileOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <Link href="/" aria-label="Miamisu Home anasayfa">
            <Logo dark={transparent} className="h-11 sm:h-14" />
          </Link>

          {/* Masaüstü nav */}
          <nav className="hidden items-center gap-8 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative text-sm font-medium tracking-wide transition-colors",
                  "after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-accent after:transition-all after:duration-300",
                  iconClass,
                  pathname === item.href
                    ? cn("after:w-full", transparent ? "text-white" : "text-foreground")
                    : "after:w-0 hover:after:w-full",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Sağ ikonlar */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              className={cn("p-2 transition-colors", iconClass)}
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Ara"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              href="/begendiklerim"
              className={cn("hidden p-2 transition-colors sm:block", iconClass)}
              aria-label="Beğendiklerim"
            >
              <Heart className="h-5 w-5" />
            </Link>
            <Link
              href={user ? "/hesabim" : "/giris"}
              className={cn("p-2 transition-colors", iconClass)}
              aria-label={user ? `Hesabım (${user.name})` : "Giriş yap"}
            >
              {user ? (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground ring-2 ring-accent/25 transition-transform hover:scale-105"
                  title={user.name}
                >
                  {user.name.trim().charAt(0).toLocaleUpperCase("tr-TR")}
                </span>
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </Link>
            <Link
              href="/sepet"
              className={cn("relative p-2 transition-colors", iconClass)}
              aria-label="Sepet"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Arama çubuğu */}
        {searchOpen && (
          <div className="border-t border-border bg-background">
            <form
              onSubmit={submitSearch}
              className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6"
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Mumluk, vazo, traverten..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Kapat">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobil menü paneli */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-background shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Logo className="h-10" />
              <button onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat" className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col px-5 py-6">
              {[{ href: "/", label: "Anasayfa" }, ...NAV, { href: "/begendiklerim", label: "Beğendiklerim" }].map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "border-b border-border/60 py-4 font-display text-xl transition-colors hover:text-accent",
                      pathname === item.href && "text-accent",
                    )}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
            <div className="mt-auto space-y-4 border-t border-border px-5 py-5">
              <Link
                href={user ? "/hesabim" : "/giris"}
                className="flex items-center gap-3 text-sm font-medium"
              >
                {user ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {user.name.trim().charAt(0).toLocaleUpperCase("tr-TR")}
                  </span>
                ) : (
                  <UserIcon className="h-4 w-4" />
                )}
                {user ? `Hesabım (${user.name.split(" ")[0]})` : "Giriş Yap / Üye Ol"}
              </Link>
              <Link
                href="/siparis-takip"
                className="flex items-center gap-3 text-sm font-medium text-muted-foreground"
              >
                <PackageSearch className="h-4 w-4" />
                Sipariş Takibi
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
