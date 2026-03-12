import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function HakkimizdaPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-24">
        <section className="max-w-5xl mx-auto px-6 lg:px-8 space-y-12">
          <header>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium mb-3 mt-10">Hakkımızda</p>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-4">
              Eviniz ve konforunuz için buradayız
            </h1>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              Mia Miss, evinizi sadece güzel göstermek için değil; aynı zamanda kendinizi iyi hissettiğiniz, size ait
              bir mekâna dönüştürmek için var.
            </p>
          </header>

          <section className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div className="space-y-6">
              <h2 className="font-serif text-2xl text-foreground">Hakkımızda / Müşteri Hizmetleri</h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Sizin için buradayız.</strong> Eviniz ve sizin eşsiz konforunuz için, deneyimlerinizi ve
                karşılaştığınız sorunları duymak bizim için çok değerli. Sorunlarınız yeni çözümlere, deneyimleriniz ise
                yeni fikirlere ilham verir.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Bizimle paylaşın.</strong> İstediğiniz zaman bize yazabilirsiniz. Size yardımcı olmak için
                buradayız.
              </p>
              <div className="rounded-2xl border border-border/70 bg-muted/50 px-4 py-3 text-sm inline-flex items-center gap-3">
                <span className="font-medium text-foreground">Email:</span>
                <span className="text-muted-foreground">info@miamiss.com</span>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="font-serif text-2xl text-foreground">Misyonumuz</h2>
              <p className="text-muted-foreground leading-relaxed">
                İşlevsel, güzel, uzun ömürlü; doğadan ilham alan tasarımlarla evinize konuk olmak. Her parça, günlük
                hayatınıza hem estetik hem de pratik bir değer katmak için seçilir.
              </p>

              <h2 className="font-serif text-2xl text-foreground mt-6">Perspektifimiz</h2>
              <p className="text-muted-foreground leading-relaxed">
                Mekânsal, zamansal ve işlevsel olan evlerimizi kendi ruhumuzla eşlemek istiyoruz. Bizim için bir bütün
                olmak; hayatımızla, alışkanlıklarımızla ve evimizle uyum içinde yaşamak demek. Çünkü hayatımızın kabuğu,
                aslında evimizdir.
              </p>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </>
  )
}

