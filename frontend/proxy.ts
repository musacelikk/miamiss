import { NextResponse, type NextRequest } from "next/server"

/**
 * admin.miamisuhome.com -> admin paneli (URL'de /admin oneki olmadan)
 * miamisuhome.com       -> www.miamisuhome.com (kalici 308)
 * miamisuhome.com/admin -> admin subdomain'ine yonlendirilir
 * localhost'ta test: http://admin.localhost:3000
 */
const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN ?? "admin.miamisuhome.com"

// Admin alt alan adinda site tarafindan servis edilmesi gereken yollar (giris ekrani vb.)
const PASSTHROUGH = ["/giris", "/kayit"]

export function proxy(request: NextRequest) {
  const hostHeader = request.headers.get("host") ?? ""
  const host = hostHeader.split(":")[0]?.toLowerCase() ?? ""
  const { pathname } = request.nextUrl
  const isAdminHost = host === ADMIN_DOMAIN || host.startsWith("admin.localhost")

  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")

  // Apex domain her zaman www'ye yonlensin (SEO + tek canonical host)
  // /admin istekleri dogrudan admin subdomain'ine gitsin (cift redirect olmasin)
  if (host === "miamisuhome.com") {
    if (pathname.startsWith("/admin")) {
      const clean = pathname.replace(/^\/admin/, "") || "/"
      return NextResponse.redirect(`https://${ADMIN_DOMAIN}${clean}${request.nextUrl.search}`, 308)
    }
    // Dikkat: nextUrl.clone() uzerinde url.host atamasi mevcut portu (Railway'de 8080)
    // temizlemez; bu yuzden hedef URL'i acikca string olarak kuruyoruz.
    return NextResponse.redirect(
      `https://www.miamisuhome.com${pathname}${request.nextUrl.search}`,
      308,
    )
  }

  if (isAdminHost) {
    // Temiz URL: admin.x.com/admin/urunler -> admin.x.com/urunler
    if (pathname.startsWith("/admin")) {
      const clean = pathname.replace(/^\/admin/, "") || "/"
      return NextResponse.redirect(`${proto}://${host}${clean}${request.nextUrl.search}`)
    }
    if (PASSTHROUGH.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return NextResponse.next()
    }
    const url = request.nextUrl.clone()
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`
    return NextResponse.rewrite(url)
  }

  // Production ana domainde /admin'e girilirse admin subdomain'ine tasi
  if (
    pathname.startsWith("/admin") &&
    (host === "miamisuhome.com" || host === "www.miamisuhome.com")
  ) {
    const clean = pathname.replace(/^\/admin/, "") || "/"
    return NextResponse.redirect(`https://${ADMIN_DOMAIN}${clean}${request.nextUrl.search}`)
  }

  return NextResponse.next()
}

export const config = {
  // Statik dosyalar (_next, uzantili dosyalar) ve API haric her yol
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
}
