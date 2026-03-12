"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function IletisimPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-24">
        <section className="max-w-4xl mx-auto px-6 lg:px-8 space-y-10">
          <header>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium mb-3 mt-10">İletişim</p>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-4">
              Sizin için buradayız
            </h1>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              Eviniz ve sizin eşsiz konforunuz için, deneyimlerinizi ve karşılaştığınız sorunları duymak bizim için çok
              değerli. Sorunlarınız yeni çözümlere, deneyimleriniz ise yeni fikirlere ilham verir.
            </p>
          </header>

          <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-start">
            {/* Contact form (dummy, no backend) */}
            <div className="rounded-3xl border border-border/70 bg-card/80 p-6 lg:p-8 shadow-sm space-y-5">
              <h2 className="font-serif text-xl text-foreground">Bizimle paylaşın</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Aşağıdaki formu kullanarak istek, öneri veya sorunlarınızı bize iletebilirsiniz. En kısa sürede size geri
                dönmeye çalışacağız.
              </p>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  alert("Mesajınız alındı. Şu an için demo ortamındasınız, gerçek bir gönderim yapılmadı.")
                }}
              >
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-sm font-medium text-foreground">
                    Ad Soyad
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    E-posta
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="message" className="text-sm font-medium text-foreground">
                    Mesajınız
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Gönder
                </button>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Bu form demo amaçlıdır; canlı ortamda bir e-posta servisine bağlanabilir.
                </p>
              </form>
            </div>

            {/* Static contact info / mission text */ }
            <aside className="space-y-7">
              <div className="space-y-3">
                <h2 className="font-serif text-xl text-foreground">İletişim kanallarımız</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  İstediğiniz zaman bize yazabilirsiniz. Size yardımcı olmak için buradayız.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">E-posta:</span> info@miamiss.com
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Telefon:</span> +90 212 000 00 00
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Adres:</span> İstanbul, Türkiye
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-serif text-lg text-foreground">Misyonumuz</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  İşlevsel, güzel, uzun ömürlü; doğadan ilham alan tasarımlarla evinize konuk olmak. Her parça, günlük
                  hayatınıza hem estetik hem de pratik bir değer katmak için seçilir.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-serif text-lg text-foreground">Perspektifimiz</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Mekânsal, zamansal ve işlevsel olan evlerimizi kendi ruhumuzla eşlemek istiyoruz. Bizim için bir
                  bütün olmak; hayatımızla, alışkanlıklarımızla ve evimizle uyum içinde yaşamak demek. Çünkü
                  hayatımızın kabuğu aslında evimizdir.
                </p>
              </div>
            </aside>
          </section>
        </section>
      </main>
      <Footer />
    </>
  )
}

