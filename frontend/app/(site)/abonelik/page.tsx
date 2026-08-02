"use client"

import Link from "next/link"
import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, MailX } from "lucide-react"
import { api } from "@/lib/api"

function UnsubscribeContent() {
  const params = useSearchParams()
  const [state, setState] = useState<"loading" | "done" | "error">("loading")
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const email = params.get("email")
    const token = params.get("token")
    if (!email || !token) {
      setState("error")
      return
    }
    api("/marketing/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ email, token }),
      auth: false,
    })
      .then(() => setState("done"))
      .catch(() => setState("error"))
  }, [params])

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      {state === "loading" && (
        <>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-accent" />
          <p className="mt-4 text-sm text-muted-foreground">İşleminiz yapılıyor...</p>
        </>
      )}
      {state === "done" && (
        <>
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" strokeWidth={1.2} />
          <h1 className="mt-6 font-display text-3xl">Abonelikten Çıktınız</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            E-posta adresiniz pazarlama listemizden kaldırıldı; artık kampanya
            e-postası almayacaksınız. Sipariş ve destek bildirimleri bundan
            etkilenmez.
          </p>
        </>
      )}
      {state === "error" && (
        <>
          <MailX className="mx-auto h-14 w-14 text-destructive" strokeWidth={1.2} />
          <h1 className="mt-6 font-display text-3xl">Bağlantı Geçersiz</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Abonelikten çıkma bağlantısı doğrulanamadı. E-postadaki bağlantıya
            yeniden tıklayın veya destek ekibimize yazın.
          </p>
        </>
      )}
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
      >
        Anasayfaya Dön
      </Link>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  )
}
