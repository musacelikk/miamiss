import Link from "next/link"
import { Facebook, Instagram, Mail, MailIcon, MapPin, MessageCircle, Phone, X } from "lucide-react"

const footerLinks = {
  urunler: [
    { label: "Depolama & Organizasyon", href: "/urunler" },
    { label: "Mobilya & Sehpalar", href: "/urunler" },
    { label: "Vazolar & Saksılar", href: "/urunler" },
    { label: "Tüm koleksiyon", href: "/urunler" },
  ],
  sirket: [
    { label: "Blog", href: "/blog" },
    { label: "Hakkımızda", href: "/hakkimizda" },
    { label: "İş birlikleri", href: "/iletisim" },
  ],
  destek: [
    { label: "Kargo & Teslimat", href: "/iletisim" },
    { label: "İade & Değişim", href: "/iletisim" },
    { label: "İletişim", href: "/iletisim" },
  ],
}

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <img src="/logo/logo-w.png" alt="Mia Miss logo" className="h-14 w-auto md:h-20" />
            </Link>
            <p className="text-background/70 leading-relaxed mb-6 max-w-sm text-sm">
            Mia Miss Ailesinin Bir Parçası Ol
            </p>

            {/* Social */}
            <div className="flex items-center gap-3 mb-6">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-background/10 border border-background/20 flex items-center justify-center hover:bg-background/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-background/10 border border-background/20 flex items-center justify-center hover:bg-background/20 transition-colors"
                aria-label="X"
              >
                <X className="w-4 h-4" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-background/10 border border-background/20 flex items-center justify-center hover:bg-background/20 transition-colors"
                aria-label="TikTok"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-background/10 border border-background/20 flex items-center justify-center hover:bg-background/20 transition-colors"
                aria-label="YouTube"
              >
                <MailIcon className="w-4 h-4" />
              </a>
            </div>

            <div id="contact" className="space-y-2.5 text-sm text-background/60">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>info@miamiss.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>+90 212 000 00 00</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>İstanbul, Türkiye</span>
              </div>
            </div>
          </div>

          {/* Ürünler */}
          <div>
            <h4 className="font-medium text-background text-sm uppercase tracking-[0.15em] mb-5">Ürünler</h4>
            <ul className="space-y-3">
              {footerLinks.urunler.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-background/60 hover:text-background transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Şirket */}
          <div>
            <h4 className="font-medium text-background text-sm uppercase tracking-[0.15em] mb-5">Şirket</h4>
            <ul className="space-y-3">
              {footerLinks.sirket.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-background/60 hover:text-background transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Destek */}
          <div>
            <h4 className="font-medium text-background text-sm uppercase tracking-[0.15em] mb-5">Müşteri Hizmetleri</h4>
            <ul className="space-y-3">
              {footerLinks.destek.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-background/60 hover:text-background transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-background/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/40">© 2026 Mia Miss. Tüm hakları saklıdır.</p>
          <div className="flex gap-6 text-sm text-background/40">
            <Link href="#" className="hover:text-background/70 transition-colors">
              Aydınlatma metni
            </Link>
            <Link href="#" className="hover:text-background/70 transition-colors">
              Gizlilik politikası
            </Link>
            <Link href="#" className="hover:text-background/70 transition-colors">
              Mesafeli satış sözleşmesi
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
