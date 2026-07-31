"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        auth: false,
      })
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem tamamlanamadı")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="text-center">
        <p className="eyebrow mb-3">Şifre Sıfırlama</p>
        <h1 className="font-display text-4xl">Şifrenizi mi Unuttunuz?</h1>
      </div>

      {sent ? (
        <div className="mt-10 rounded-md border border-border bg-card p-8 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-accent" strokeWidth={1.3} />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama bağlantısını
            gönderdik. Gelen kutunuzu (ve spam klasörünü) kontrol edin — bağlantı{" "}
            <strong className="text-foreground">1 saat</strong> geçerlidir.
          </p>
          <Link
            href="/giris"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Giriş ekranına dön
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-10 rounded-md border border-border bg-card p-6 sm:p-8">
          <p className="text-sm text-muted-foreground">
            Hesabınızın e-posta adresini girin, şifrenizi yenilemeniz için size bir
            bağlantı gönderelim.
          </p>
          <div className="mt-5">
            <label className="mb-1.5 block text-xs font-semibold">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="ornek@eposta.com"
            />
          </div>
          <button
            disabled={busy}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Sıfırlama Bağlantısı Gönder
          </button>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/giris" className="font-semibold text-accent hover:underline">
              Giriş ekranına dön
            </Link>
          </p>
        </form>
      )}
    </div>
  )
}
