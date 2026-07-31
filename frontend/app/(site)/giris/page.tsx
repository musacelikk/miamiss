"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/providers"
import { api, API_URL } from "@/lib/api"

function GoogleButton() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    api<{ enabled: boolean }>("/auth/google/enabled", { auth: false })
      .then((r) => setEnabled(r.enabled))
      .catch(() => {})
  }, [])
  if (!enabled) return null
  return (
    <>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> veya <span className="h-px flex-1 bg-border" />
      </div>
      <a
        href={`${API_URL}/auth/google`}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-border text-sm font-semibold transition-colors hover:bg-secondary"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" />
        </svg>
        Google ile devam et
      </a>
    </>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const user = await login(email, password)
      toast.success(`Hoş geldiniz, ${user.name.split(" ")[0]}!`)
      router.push(user.role === "ADMIN" ? "/admin" : "/hesabim")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Giriş yapılamadı")
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="text-center">
        <p className="eyebrow mb-3">Üye Girişi</p>
        <h1 className="font-display text-4xl">Tekrar Hoş Geldiniz</h1>
      </div>

      <form onSubmit={submit} className="mt-10 rounded-md border border-border bg-card p-6 sm:p-8">
        <div className="space-y-4">
          <div>
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
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Şifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>
        </div>
        <button
          disabled={busy}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Giriş Yap
        </button>

        <GoogleButton />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Hesabınız yok mu?{" "}
          <Link href="/kayit" className="font-semibold text-accent hover:underline">
            Üye olun
          </Link>
        </p>
      </form>
    </div>
  )
}
