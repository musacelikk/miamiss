import type React from "react"
import { SiteHeader } from "@/components/site/header"
import { SiteFooter } from "@/components/site/footer"
import { CookieBanner } from "@/components/site/cookie-banner"
import { API_URL } from "@/lib/api"

/**
 * Anasayfa hero'su tam ekran video/görsel ise header saydam olarak
 * içeriğin üstüne biner. Sunucuda okunur ki ilk boyamada zıplama olmasın.
 */
async function heroIsFullBackground(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/settings/homepage`, { next: { revalidate: 300 } })
    if (!res.ok) return false
    const hp = (await res.json()) as {
      heroBackgroundType?: string
      heroBackgroundVideo?: string
      heroBackgroundImage?: string
    }
    if (hp.heroBackgroundType === "video") return !!hp.heroBackgroundVideo
    if (hp.heroBackgroundType === "image") return !!hp.heroBackgroundImage
    return false
  } catch {
    return false
  }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const heroOverlay = await heroIsFullBackground()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader heroOverlay={heroOverlay} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CookieBanner />
    </div>
  )
}
