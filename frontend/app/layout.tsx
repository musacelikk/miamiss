import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Manrope, Cormorant_Garamond } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { API_URL } from "@/lib/api"

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.miamisuhome.com"

interface SeoSettings {
  siteTitle: string
  siteDescription: string
  keywords: string
  ogImage: string
  googleSiteVerification: string
  googleAnalyticsId: string
  googleAdsId: string
  metaPixelId: string
}

const SEO_FALLBACK: SeoSettings = {
  siteTitle: "Miamisu Home — Doğal Taş Ev Aksesuarları",
  siteDescription:
    "Doğal traverten ve mermerden el işçiliğiyle üretilen mumluklar, vazolar, dekoratif tabaklar ve ev aksesuarları. Evinize taşın zamansız zarafetini taşıyın.",
  keywords:
    "traverten, mermer, doğal taş, mumluk, vazo, ev aksesuarları, el işçiliği, dekorasyon",
  ogImage: "/logo/logo.png",
  googleSiteVerification: "",
  googleAnalyticsId: "",
  googleAdsId: "",
  metaPixelId: "",
}

/** Admin panelinden yönetilen SEO ayarları (5 dk önbellekli, hata durumunda varsayılanlar) */
async function getSeo(): Promise<SeoSettings> {
  try {
    const res = await fetch(`${API_URL}/settings/seo`, { next: { revalidate: 300 } })
    if (!res.ok) return SEO_FALLBACK
    return { ...SEO_FALLBACK, ...((await res.json()) as Partial<SeoSettings>) }
  } catch {
    return SEO_FALLBACK
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: seo.siteTitle,
      template: "%s | Miamisu Home",
    },
    description: seo.siteDescription,
    keywords: seo.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
    alternates: { canonical: "/" },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      siteName: "Miamisu Home",
      locale: "tr_TR",
      type: "website",
      url: SITE_URL,
      title: seo.siteTitle,
      description: seo.siteDescription,
      images: [{ url: seo.ogImage || "/logo/logo.png", width: 1200, height: 630, alt: "Miamisu Home" }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.siteTitle,
      description: seo.siteDescription,
      images: [seo.ogImage || "/logo/logo.png"],
    },
    verification: seo.googleSiteVerification
      ? { google: seo.googleSiteVerification }
      : undefined,
    icons: {
      icon: "/logo/fav.ico",
      shortcut: "/logo/fav.ico",
      apple: "/logo/logo.png",
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const seo = await getSeo()

  // Organizasyon + site içi arama yapılandırılmış verisi
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Miamisu Home",
        url: SITE_URL,
        logo: `${SITE_URL}/logo/logo.png`,
        sameAs: ["https://www.instagram.com/miamiss"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Miamisu Home",
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "tr-TR",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/urunler?search={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  }

  // Google Ads / GA4 aynı gtag.js üzerinden yüklenir
  const gtagId = seo.googleAnalyticsId || seo.googleAdsId

  return (
    <html lang="tr">
      <body className={`${manrope.variable} ${cormorant.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {gtagId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                ${seo.googleAnalyticsId ? `gtag('config', '${seo.googleAnalyticsId}');` : ""}
                ${seo.googleAdsId ? `gtag('config', '${seo.googleAdsId}');` : ""}
              `}
            </Script>
          </>
        )}
        {seo.metaPixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
              document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${seo.metaPixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
