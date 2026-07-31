"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/providers"
import { isValidPhone, phoneInputProps, sanitizeName, sanitizePhone } from "@/lib/input"

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" })
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.phone && !isValidPhone(form.phone)) {
      toast.error("Geçerli bir telefon numarası girin (05xx xxx xx xx).")
      return
    }
    setBusy(true)
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      })
      toast.success("Üyeliğiniz oluşturuldu, hoş geldiniz!")
      router.push("/hesabim")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kayıt yapılamadı")
      setBusy(false)
    }
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="text-center">
        <p className="eyebrow mb-3">Üyelik</p>
        <h1 className="font-display text-4xl">Aramıza Katılın</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Siparişlerinizi takip edin, favorilerinizi kaydedin.
        </p>
      </div>

      <form onSubmit={submit} className="mt-10 rounded-md border border-border bg-card p-6 sm:p-8">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Ad Soyad</label>
            <input
              required
              minLength={2}
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: sanitizeName(e.target.value) })}
              className={input}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">E-posta</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={input}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Telefon (isteğe bağlı)</label>
            <input
              {...phoneInputProps}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })}
              className={input}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Şifre</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={input}
              placeholder="En az 6 karakter"
            />
          </div>
        </div>
        <button
          disabled={busy}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Üye Ol
        </button>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          Üye olarak <Link href="/kvkk" className="underline">KVKK Aydınlatma Metni</Link>'ni
          okuduğunuzu kabul etmiş olursunuz.
        </p>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Zaten üye misiniz?{" "}
          <Link href="/giris" className="font-semibold text-accent hover:underline">
            Giriş yapın
          </Link>
        </p>
      </form>
    </div>
  )
}
