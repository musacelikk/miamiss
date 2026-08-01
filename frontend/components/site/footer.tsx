"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Instagram, Mail, MapPin, Phone } from "lucide-react"
import { Logo } from "@/components/logo"
import { api, type StoreSettings } from "@/lib/api"

export function SiteFooter() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)

  useEffect(() => {
    api<StoreSettings>("/settings", { auth: false })
      .then(setSettings)
      .catch(() => {})
  }, [])

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Marka */}
          <div className="space-y-5">
            <Logo dark className="h-16 opacity-90" />
            <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/70">
              Doğal traverten ve mermerden, el işçiliğiyle üretilen zamansız ev
              aksesuarları. Her parça, taşın milyonlarca yıllık hikâyesini
              evinize taşır.
            </p>
            {settings?.instagram && (
              <a
                href={`https://instagram.com/${settings.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary-foreground/70 transition-colors hover:text-accent"
              >
                <Instagram className="h-4 w-4" />@{settings.instagram}
              </a>
            )}
          </div>

          {/* Alışveriş */}
          <div>
            <h3 className="eyebrow mb-5">Alışveriş</h3>
            <ul className="space-y-3 text-sm">
              {[
                { href: "/urunler", label: "Tüm Koleksiyon" },
                { href: "/urunler?category=mumluklar", label: "Mumluklar" },
                { href: "/urunler?category=vazolar", label: "Vazolar" },
                { href: "/urunler?category=kutular", label: "Kutular" },
                { href: "/hediye-karti", label: "Hediye Kartı" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kurumsal */}
          <div>
            <h3 className="eyebrow mb-5">Kurumsal</h3>
            <ul className="space-y-3 text-sm">
              {[
                { href: "/hakkimizda", label: "Hakkımızda" },
                { href: "/hakkimizda?tab=iletisim", label: "İletişim" },
                { href: "/blog", label: "Blog & Haberler" },
                { href: "/siparis-takip", label: "Sipariş Takibi" },
                { href: "/destek", label: "Destek" },
                { href: "/mesafeli-satis", label: "Mesafeli Satış Sözleşmesi" },
                { href: "/on-bilgilendirme", label: "Ön Bilgilendirme Formu" },
                { href: "/uyelik-sozlesmesi", label: "Üyelik Sözleşmesi" },
                { href: "/kvkk", label: "KVKK Aydınlatma Metni" },
                { href: "/iade-degisim", label: "İade & Değişim" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* İletişim */}
          <div>
            <h3 className="eyebrow mb-5">Bize Ulaşın</h3>
            <ul className="space-y-4 text-sm text-primary-foreground/70">
              {settings?.contactEmail && (
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <a href={`mailto:${settings.contactEmail}`} className="hover:text-primary-foreground">
                    {settings.contactEmail}
                  </a>
                </li>
              )}
              {settings?.contactPhone && (
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <a href={`tel:${settings.contactPhone}`} className="hover:text-primary-foreground">
                    {settings.contactPhone}
                  </a>
                </li>
              )}
              {settings?.address && (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{settings.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-8 text-xs text-primary-foreground/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Miamisu Home · miamisuhome.com — Tüm hakları saklıdır.</p>
          <p>Havale/EFT · Kapıda Ödeme · Kredi kartı çok yakında</p>
        </div>
      </div>
    </footer>
  )
}
