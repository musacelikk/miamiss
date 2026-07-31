"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  BarChart3,
  BellRing,
  Gift,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Newspaper,
  Package,
  Puzzle,
  ScrollText,
  Settings,
  ShoppingCart,
  Store,
  Tag,
  Users,
  X,
} from "lucide-react"
import { useAuth } from "@/components/providers"
import { Brand } from "@/components/brand"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/admin/raporlar", label: "Raporlar", icon: BarChart3 },
  { href: "/admin/anasayfa", label: "Anasayfa Düzeni", icon: Home },
  { href: "/admin/urunler", label: "Ürünler", icon: Package },
  { href: "/admin/siparisler", label: "Siparişler", icon: ShoppingCart },
  { href: "/admin/uyeler", label: "Üyeler", icon: Users },
  { href: "/admin/kuponlar", label: "Kuponlar", icon: Tag },
  { href: "/admin/hediye-kartlari", label: "Hediye Kartları", icon: Gift },
  { href: "/admin/bulmaca", label: "Bulmaca", icon: Puzzle },
  { href: "/admin/blog", label: "Blog & Haberler", icon: Newspaper },
  { href: "/admin/yorumlar", label: "Yorumlar", icon: MessageSquare },
  { href: "/admin/stok-talepleri", label: "Stok Talepleri", icon: BellRing },
  { href: "/admin/mesajlar", label: "Mesajlar", icon: Mail },
  { href: "/admin/loglar", label: "Loglar", icon: ScrollText },
  { href: "/admin/ayarlar", label: "Ayarlar", icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  // Admin subdomain'indeysek magaza linki ana domaine gitsin
  const [storeUrl, setStoreUrl] = useState("/")

  useEffect(() => {
    const host = window.location.host
    if (host.startsWith("admin.")) {
      setStoreUrl(`${window.location.protocol}//${host.replace(/^admin\./, "")}`)
    }
  }, [])

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.replace("/giris")
  }, [loading, user, router])

  useEffect(() => setOpen(false), [pathname])

  if (loading || !user || user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
        <Link href="/admin">
          <Brand className="text-2xl" />
        </Link>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Kapat">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="space-y-1 border-t border-sidebar-border px-3 py-4">
        <a
          href={storeUrl}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Store className="h-4 w-4" /> Mağazayı Görüntüle
        </a>
        <button
          onClick={() => {
            logout()
            window.location.assign(storeUrl)
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" /> Çıkış Yap
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Masaüstü sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">{sidebar}</aside>

      {/* Mobil sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 animate-in slide-in-from-left duration-200">
            {sidebar}
          </aside>
        </div>
      )}

      {/* İçerik */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menü">
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold">
            {NAV.find((n) =>
              n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href),
            )?.label ?? "Admin"}
          </p>
          <p className="ml-auto text-xs text-muted-foreground">{user.email}</p>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
