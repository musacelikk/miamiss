import type React from "react"
import type { Metadata } from "next"
import { DM_Sans, Fraunces } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { CartProvider } from "@/components/cart-context"
import { FavoritesProvider } from "@/components/favorites-context"
import { WordGameModal } from "@/components/word-game-modal"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
})

export const metadata: Metadata = {
  title: "Mia Miss — Ev Aksesuarları & Dekorasyon",
  description:
    "Mia Miss ile evine zarif ve doğal dokunuşlar kat. Özenle seçilmiş vazolar, mumlar ve dekoratif objelerle sıcak bir atmosfer yarat.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr">
      <body className={`${dmSans.variable} ${fraunces.variable} font-sans antialiased`}>
        <CartProvider>
          <FavoritesProvider>
            {children}
            <WordGameModal />
            <Analytics />
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  )
}
