'use client'

import { useState } from "react"
import Link from "next/link"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function KayitPage() {
  const [adSoyad, setAdSoyad] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const canSubmit = adSoyad.trim().length > 1 && email.trim() && password.length >= 6 && password === confirmPassword

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-24">
        <section className="max-w-md mx-auto px-6 lg:px-0 space-y-8">
          <header className="space-y-3 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium">Kayıt ol</p>
            <h1 className="font-serif text-3xl text-foreground">Mia Miss’e hoş geldin</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Demo amaçlıdır. Formu gönderince uyarı mesajı gösterilir.
            </p>
          </header>

          <form
            className="rounded-3xl border border-border/60 bg-card/60 p-6 space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (!canSubmit) return
              setLoading(true)
              setTimeout(() => {
                alert("Kayıt alındı! (Demo)")
                setLoading(false)
                window.location.href = "/giris"
              }, 700)
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="adSoyad">Ad Soyad</Label>
              <Input
                id="adSoyad"
                value={adSoyad}
                onChange={(e) => setAdSoyad(e.target.value)}
                placeholder="Adınız Soyadınız"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@eposta.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="en az 6 karakter"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifre (Tekrar)</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="şifreyi tekrar gir"
                required
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-xs text-destructive mt-1">Şifreler eşleşmiyor.</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <Button type="submit" disabled={loading || !canSubmit} className="rounded-full px-6">
                {loading ? "Kayıt alınıyor..." : "Hesabımı oluştur"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-full px-4 text-muted-foreground hover:text-foreground"
                onClick={() => (window.location.href = "/giris")}
              >
                Girişe dön
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Zaten hesabın var mı?{" "}
              <Link href="/giris" className="text-foreground hover:underline">
                Giriş yap
              </Link>
            </p>
          </form>
        </section>
      </main>
      <Footer />
    </>
  )
}

