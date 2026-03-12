import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function GirisPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-24">
        <section className="max-w-md mx-auto px-6 lg:px-0 space-y-8 text-center">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium mb-1">Giriş yap</p>
            <h1 className="font-serif text-3xl text-foreground">Mia Miss hesabı</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Şu anda demo ortamındasınız. Giriş sistemi henüz aktif değil, ancak ileride burada hesap girişini
              gerçekleştireceksiniz.
            </p>
          </header>
        </section>
      </main>
      <Footer />
    </>
  )
}

