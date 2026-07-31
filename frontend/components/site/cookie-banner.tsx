"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Cookie } from "lucide-react"

const KEY = "miamisu_cookie_consent"

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true)
  }, [])

  const decide = (value: "accepted" | "rejected") => {
    localStorage.setItem(KEY, value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-lg border border-border bg-background p-4 shadow-2xl sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <Cookie className="hidden h-6 w-6 shrink-0 text-accent sm:block" strokeWidth={1.5} />
        <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
          Alışveriş deneyiminizi iyileştirmek için sepet ve oturum bilgilerinizi
          cihazınızda saklıyoruz. Detaylar için{" "}
          <Link href="/kvkk" className="font-semibold text-accent underline">
            KVKK Aydınlatma Metni
          </Link>
          'ni inceleyebilirsiniz.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => decide("rejected")}
            className="h-10 rounded-md border border-border px-4 text-xs font-semibold transition-colors hover:border-foreground/40"
          >
            Reddet
          </button>
          <button
            onClick={() => decide("accepted")}
            className="h-10 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-accent"
          >
            Kabul Et
          </button>
        </div>
      </div>
    </div>
  )
}
