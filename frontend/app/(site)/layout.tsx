import type React from "react"
import { SiteHeader } from "@/components/site/header"
import { SiteFooter } from "@/components/site/footer"
import { CookieBanner } from "@/components/site/cookie-banner"

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CookieBanner />
    </div>
  )
}
