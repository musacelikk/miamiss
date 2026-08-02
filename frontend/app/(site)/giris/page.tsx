"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/providers"
import { GoogleButton } from "@/components/google-button"


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
            <div className="mb-1.5 flex items-baseline justify-between">
              <label className="text-xs font-semibold">Şifre</label>
              <Link
                href="/sifremi-unuttum"
                className="text-xs font-medium text-accent hover:underline"
              >
                Şifremi unuttum
              </Link>
            </div>
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

      {/* Misafir siparişi olanlar için sessiz bir kısayol */}
      <p className="mt-5 text-center text-xs text-muted-foreground">
        Üye olmadan mı sipariş verdiniz?{" "}
        <Link href="/siparis-takip" className="font-semibold text-accent hover:underline">
          Sipariş takibi yapın
        </Link>
      </p>
    </div>
  )
}
