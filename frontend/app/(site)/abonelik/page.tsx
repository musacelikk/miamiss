"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, MailX } from "lucide-react"
import { api } from "@/lib/api"

/**
 * Abonelikten cikma ONAY sayfasi. Otomatik islem yapilmaz:
 * hangi adresin cikarilacagi acikca gosterilir ve buton bekler.
 * (Mail tarayici botlarinin linki acarak istemsiz cikarmasini da engeller.)
 */
function UnsubscribeContent() {
  const params = useSearchParams()
  const email = params.get("email") ?? ""
  const token = params.get("token") ?? ""
  const [state, setState] = useState<"confirm" | "busy" | "done" | "error">(
    email && token ? "confirm" : "error",
  )

  const unsubscribe = async () => {
    setState("busy")
    try {
      await api("/marketing/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ email, token }),
        auth: false,
      })
      setState("done")
    } catch {
      setState("error")
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      {(state === "confirm" || state === "busy") && (
        <>
          <MailX className="mx-auto h-14 w-14 text-accent" strokeWidth={1.2} />
          <h1 className="mt-6 font-display text-3xl">Abonelikten Çık</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Aşağıdaki e-posta adresi pazarlama listemizden çıkarılacak:
          </p>
          <p className="mt-4 rounded-md border border-border bg-card px-4 py-3 font-mono text-sm font-semibold">
            {email}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Farklı bir adresten çıkmak istiyorsanız, o adrese gelen e-postadaki
            bağlantıyı kullanın. Sipariş ve destek bildirimleri bu işlemden
            etkilenmez.
          </p>
          <button
            onClick={() => void unsubscribe()}
            disabled={state === "busy"}
            className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            {state === "busy" && <Loader2 className="h-4 w-4 animate-spin" />}
            Bu Adresi Listeden Çıkar
          </button>
        </>
      )}

      {state === "done" && (
        <>
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" strokeWidth={1.2} />
          <h1 className="mt-6 font-display text-3xl">Abonelikten Çıktınız</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            <strong className="font-mono text-foreground">{email}</strong> adresi
            pazarlama listemizden kaldırıldı; bu adrese artık kampanya e-postası
            gönderilmeyecek.
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
        className="mt-6 inline-flex h-11 items-center rounded-md border border-border px-8 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
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
