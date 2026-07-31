"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { api, setToken, type User } from "@/lib/api"
import { useAuth } from "@/components/providers"

function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const { refresh } = useAuth()
  const token = params.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)

  if (!token) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" strokeWidth={1.3} />
        <p className="mt-4 text-sm text-muted-foreground">
          Bağlantı geçersiz görünüyor. Lütfen sıfırlama talebini yeniden oluşturun.
        </p>
        <Link
          href="/sifremi-unuttum"
          className="mt-5 inline-block text-sm font-semibold text-accent hover:underline"
        >
          Yeni bağlantı iste
        </Link>
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error("Şifreler birbiriyle uyuşmuyor.")
      return
    }
    setBusy(true)
    try {
      const res = await api<{ token: string; user: User }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
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

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  return (
    <form onSubmit={submit} className="rounded-md border border-border bg-card p-6 sm:p-8">
      <div className="space-y-4">
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
        disabled={busy}
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Şifremi Güncelle
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="text-center">
        <p className="eyebrow mb-3">Şifre Sıfırlama</p>
        <h1 className="font-display text-4xl">Yeni Şifrenizi Belirleyin</h1>
      </div>
      <div className="mt-10">
        <Suspense
          fallback={
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
