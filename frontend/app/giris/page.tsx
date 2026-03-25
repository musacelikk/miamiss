'use client'

import { useState } from "react"
import Link from "next/link"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function GirisPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-40 pb-24">
        <section className="max-w-md mx-auto px-6 lg:px-0 space-y-8">
          <header className="space-y-3 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium">Giriş yap</p>
            <h1 className="font-serif text-3xl text-foreground">Mia Miss hesabı</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Demo amaçlıdır. Formu gönderince uyarı mesajı gösterilir.
            </p>
          </header>

          <form
            className="rounded-3xl border border-border/60 bg-card/60 p-6 space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              setLoading(true)
              setTimeout(() => {
                alert("Giriş başarılı! (Demo)")
                setLoading(false)
              }, 600)
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@eposta.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <Button type="submit" disabled={loading} className="rounded-full px-6">
                {loading ? "Giriş yapılıyor..." : "Giriş yap"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-full px-4 text-muted-foreground hover:text-foreground"
                onClick={() => alert("Şifre sıfırlama demo.")}
              >
                Şifremi unuttum
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Hesabın yok mu?{" "}
              <Link href="/kayit" className="text-foreground hover:underline">
                Kayıt ol
              </Link>
            </p>
          </form>
        </section>
      </main>
      <Footer />
    </>
  )
}

