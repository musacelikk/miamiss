import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const posts = [
  {
    slug: "sikici-duvarlardan-kurtulma-citali-duvarlar",
    title: "Sıkıcı Duvarlardan Kurtulma Tüyosu: Çıtalı Duvarlar",
    intro:
      "Duvarlarınız size sıkıcı ya da fazla boş mu geliyor? Koridorunuzda sadece sade bir boya ve halı mı var, yoksa hâlâ “eksik bir şeyler” mi hissediyorsunuz?",
    content: [
      "Size, bunu kendi başınıza yapabileceğinizi söylesek?",
      "Yıllardır hayatımızda olan ahşap çıta uygulamaları, özellikle koridorlara bambaşka bir hava katıyor. Üstelik tecrübeye ihtiyacınız yok; yalnızca metre, testere, çıta, yapıştırıcı ve boya gibi kolay bulunabilir malzemeler yeterli.",
      "Koridorunuzu ölçün ve duvar boyunca eşit aralıklarla dikey çıtalar hayal edin.",
      "Süpürgelik hizasına bir yatay çıta, yaklaşık bir metre üstüne ikinci çıtayı yapıştırın. Ölçüyü azaltıp artırabilirsiniz; çok alçakta kalırsa etkisi az olur, çok yükseğe çıkarsanız koridoru daraltabilir.",
      "Bu iki çıta arasındaki alana gelecek dikey çıtaları ölçüp kesin ve eşit aralıklarla yapıştırın.",
      "Tüm çıtalar bittikten sonra, çıta ile duvar arasında boşluk kalmaması için birleşim yerlerine silikon/mastik çekin.",
      "Seçtiğiniz renkle boyayın. Maskeleme bandı kullanarak alan dışına taşmadan, temiz bir sonuç elde edebilirsiniz.",
      "Koridoru boğmamak için koyu renklerden kaçınmanızı, açık tonlar tercih etmenizi öneririz.",
      "Son dokunuş için aplikler, küçük tablolar ya da aile fotoğraflarınızla koridora kendi izinizi bırakın.",
    ],
  },
  {
    slug: "odalarimizi-zenginlestiren-bitkiler",
    title: "Odalarımızı Zenginleştiren, Havasına Hava Katan Bitkiler",
    intro:
      "Evinizde hiç bitki yoksa, aslında neyin eksik olduğunu fark etmeyebilirsiniz. Yıllarca küçük bitkilerimi balkonda yetiştirdim; ama salona koyduğum büyük bir bitki ile odanın enerjisi tamamen değişti.",
    content: [
      "Salonunuzda konumlandıracağınız büyük bir bitki – örneğin starliçe, deve tabanı veya salon palmiyesi – odanın enerjisini bir anda yenileyebilir.",
      "Bir anda “Daha önce cansız bir odada yaşıyormuşum.” diyebiliyorsunuz.",
      "Bitkiler, enerjisi çok yüksek canlılardır. Şehirlerdeki palmiye ağaçlarını düşünün; adeta şehrin süsüdürler.",
      "Yeşilin insan üzerindeki etkisi; doğayı çağrıştırması, dinginleştirmesi, yenilemesi ve strese iyi gelmesiyle bilinir.",
      "Kısacası: Evinize bir bitki ekleyin, odanızın havasının nasıl değiştiğini kendiniz görün.",
    ],
  },
  {
    slug: "sevdikleriniz-icin-hediye-ve-ilham-perileri",
    title: "Sevdikleriniz İçin Hediye ve İlham Perileri",
    intro:
      "Küçük bir mum, doğru seçilmiş bir aksesuar ya da özenle hazırlanmış bir hediye kutusu… Mia Miss, sevdiklerinize vereceğiniz hediyelere de ilham olmayı amaçlıyor.",
    content: [
      "Hediye seçerken karşınızdakinin yaşam alanını düşünmek, hediyenizi çok daha özel kılar. Sevdiği renkler, sevdiği kokular, evinin tarzı… Hepsi küçük ipuçlarıdır.",
      "Kokulu bir mum, zarif bir obje veya küçük bir dekorasyon seti; hem kullanışlı hem de duygusal değeri yüksek hediyelerdir.",
      "Kısa bir mola verin, sevdiğiniz kokulu bir mumu yakın ve birkaç dakika sadece alevi izlemenin, kokuyu hissetmenin tadını çıkarın.",
      "Günlük koşturmacanın içinde bu küçük ritüeller, evinizi de sizi de sakinleştirir.",
    ],
  },
]

export default function BlogPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-24">
        <section className="max-w-5xl mx-auto px-6 lg:px-8 space-y-10">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium mb-1">Blog</p>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground">
              Evinize ilham veren hikâyeler
            </h1>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              Sadece ürünlerle değil, fikirlerle de yanınızdayız. Duvarlardan bitkilere, hediye fikirlerinden küçük
              ritüellere kadar, evinizde sizi iyi hissettirecek öneriler.
            </p>
          </header>

          <div className="space-y-10">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="rounded-3xl border border-border/70 bg-card/80 p-6 lg:p-8 shadow-sm space-y-4"
              >
                <header className="space-y-2">
                  <h2 className="font-serif text-2xl md:text-3xl text-foreground">{post.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{post.intro}</p>
                </header>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  {post.content.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

