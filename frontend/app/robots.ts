import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.miamisuhome.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/hesabim",
        "/odeme",
        "/sepet",
        "/giris",
        "/kayit",
        "/begendiklerim",
        "/siparis-basarili",
        "/sifremi-unuttum",
        "/sifre-sifirla",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
