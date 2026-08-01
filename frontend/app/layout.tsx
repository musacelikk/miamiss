import type React from "react"
import type { Metadata } from "next"
import { Manrope, Cormorant_Garamond } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.miamisuhome.com"),
  title: {
    default: "Miamisu Home — Doğal Taş Ev Aksesuarları",
    template: "%s | Miamisu Home",
  },
  description:
    "Doğal traverten ve mermerden el işçiliğiyle üretilen mumluklar, vazolar, dekoratif tabaklar ve ev aksesuarları. Evinize taşın zamansız zarafetini taşıyın.",
  openGraph: {
    siteName: "Miamisu Home",
    locale: "tr_TR",
    type: "website",
    title: "Miamisu Home — Doğal Taş Ev Aksesuarları",
    description:
      "Doğal traverten ve mermerden el işçiliğiyle üretilen mumluklar, vazolar, dekoratif tabaklar ve ev aksesuarları.",
  },
  icons: {
    icon: "/logo/fav.ico",
    shortcut: "/logo/fav.ico",
    apple: "/logo/logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${manrope.variable} ${cormorant.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
