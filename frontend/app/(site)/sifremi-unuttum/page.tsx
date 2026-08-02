"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, KeyRound, Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"
import { api, setToken, type User } from "@/lib/api"
import { useAuth } from "@/components/providers"
import { onlyDigits } from "@/lib/input"

/**
 * Iki adimli sifre sifirlama:
 * 1) E-posta gir -> 5 dk gecerli 6 haneli kod maile gider
 * 2) Kod + yeni sifre gir -> sifre degisir, otomatik giris yapilir
 */
export default function ForgotPasswordPage() {
  const router = useRouter()
  const { refresh } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        auth: false,
      })
      toast.success("Kod gönderildi — gelen kutunu kontrol et")
      setStep(2)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem tamamlanamadı")
    } finally {
      setBusy(false)
    }
  }

  const resetWithCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error("Şifreler birbiriyle uyuşmuyor.")
      return
    }
    setBusy(true)
    try {
      const res = await api<{ token: string; user: User }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, code, password }),
        auth: false,
      })
      setToken(res.token)
      await refresh()
      toast.success("Şifreniz güncellendi, giriş yapıldı.")
      router.push(res.user.role === "ADMIN" ? "/admin" : "/hesabim")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Şifre güncellenemedi")
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="text-center">
        <p className="eyebrow mb-3">Şifre Sıfırlama</p>
        <h1 className="font-display text-4xl">
          {step === 1 ? "Şifrenizi mi Unuttunuz?" : "Kodu Girin"}
        </h1>
      </div>

      {step === 1 ? (
        <form
          onSubmit={requestCode}
          className="mt-10 rounded-md border border-border bg-card p-6 sm:p-8"
        >
          <p className="text-sm text-muted-foreground">
            Hesabınızın e-posta adresini girin; size{" "}
            <strong className="text-foreground">5 dakika geçerli, 6 haneli</strong> bir
            doğrulama kodu gönderelim.
          </p>
          <div className="mt-5">
            <label className="mb-1.5 block text-xs font-semibold">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
              placeholder="ornek@eposta.com"
            />
          </div>
          <button
            disabled={busy}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Kod Gönder
          </button>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/giris" className="font-semibold text-accent hover:underline">
              Giriş ekranına dön
            </Link>
          </p>
        </form>
      ) : (
        <form
          onSubmit={resetWithCode}
          className="mt-10 rounded-md border border-border bg-card p-6 sm:p-8"
        >
          <div className="flex items-start gap-3 rounded-md bg-secondary/60 p-3">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">{email}</strong> adresine 6 haneli kod
              gönderildi (spam klasörünü de kontrol edin). Kod 5 dakika geçerlidir.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Doğrulama Kodu</label>
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(onlyDigits(e.target.value, 6))}
                className={`${input} text-center font-mono text-2xl tracking-[0.5em]`}
                placeholder="••••••"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Yeni Şifre</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
                placeholder="En az 6 karakter"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Yeni Şifre (tekrar)</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={input}
              />
            </div>
          </div>

          <button
            disabled={busy || code.length !== 6}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Şifremi Sıfırla
          </button>

          <div className="mt-5 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setStep(1)
                setCode("")
              }}
              className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> E-postayı değiştir
            </button>
            <button
              type="button"
              onClick={() => void requestCode()}
              disabled={busy}
              className="font-semibold text-accent hover:underline disabled:opacity-50"
            >
              Kodu yeniden gönder
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
