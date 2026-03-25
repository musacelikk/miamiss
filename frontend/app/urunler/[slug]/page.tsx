import { notFound } from "next/navigation"
import { getProductBySlug, products } from "@/lib/products"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductDetailClient } from "./product-detail-client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AskQuestionDialog } from "./ask-question-dialog"

type Props = {
  params: Promise<{
    slug: string
  }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    return notFound()
  }

  const related = products.filter((p) => p.id !== product.id)
  const price2 = product.price / 2
  const price3 = product.price / 3
  const fmt = (amount: number) =>
    amount.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-40 pb-24">
        <section className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-full px-4 text-muted-foreground hover:text-foreground"
            >
              <Link href="/urunler">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tüm ürünler
              </Link>
            </Button>
            <p className="hidden sm:block text-xs text-muted-foreground">
              {product.category} • {product.tags?.[0] ?? "Koleksiyon"}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 items-start">
            {/* Image */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted border border-border/40 shadow-lg shadow-primary/5">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>

            {/* Sticky product panel */}
            <div className="">
              <div className="lg:sticky lg:top-40 rounded-3xl border border-border/50 bg-card/70 p-5 sm:p-6 lg:p-7 space-y-6">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium mb-0">
                    {product.category}
                  </p>
                  <h1 className="font-serif text-lg sm:text-xl md:text-2xl lg:text-3xl text-foreground leading-tight">
                    {product.name}
                  </h1>
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{product.description}</p>
                </div>

                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1 bg-muted/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/50">
                  <span className="font-serif text-3xl text-foreground">
                    {product.price.toLocaleString("tr-TR")} ₺
                  </span>
                  <span className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1 bg-background/60 whitespace-nowrap">
                    KDV dahil
                  </span>
                </div>

                {/* Add to cart + favorites (client) */}
                <ProductDetailClient product={product} />
              {/* Trust badges */}
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { icon: "🚚", text: "2-4 iş günü kargo" },
                  { icon: "↩️", text: "14 gün iade hakkı" },
                  { icon: "🌿", text: "Doğal malzeme" },
                ].map((badge) => (
                  <div
                    key={badge.text}
                    className="text-center p-3 sm:p-4 rounded-2xl bg-muted/45 border border-border/40"
                  >
                    <div className="text-lg sm:text-xl mb-1">{badge.icon}</div>
                    <p className="text-[11px] text-muted-foreground leading-tight">{badge.text}</p>
                  </div>
                ))}
              </div>
              </div>


            </div>
          </div>
        </section>

        {/* Product tabs */}
        <section className="max-w-6xl mx-auto px-6 lg:px-8 mt-12">
          <Tabs defaultValue="ozellikler">
            <TabsList className="w-full justify-start overflow-x-auto rounded-2xl bg-muted/30 p-1">
              <TabsTrigger value="ozellikler">Ürün özellikleri</TabsTrigger>
              <TabsTrigger value="aciklama">Ürün açıklaması</TabsTrigger>
              <TabsTrigger value="taksit">Taksit seçenekleri</TabsTrigger>
              <TabsTrigger value="degerlendirmeler">Değerlendirmeler</TabsTrigger>
              <TabsTrigger value="soru">Soru cevap</TabsTrigger>
            </TabsList>

            <TabsContent value="ozellikler" className="mt-6">
              <div className="rounded-3xl border border-border/60 bg-card/50 p-5 space-y-4">
                <h3 className="font-serif text-lg text-foreground">Öne çıkanlar</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                  <li>
                    <span className="text-foreground font-medium">Kategori:</span> {product.category}
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Etiketler:</span>{" "}
                    {product.tags && product.tags.length > 0 ? product.tags.join(", ") : "—"}
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Öneri:</span> Doğal tonlarla evinize sıcak
                    bir dokunuş.
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Stil:</span> Minimalin yanında zamansız.
                  </li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="aciklama" className="mt-6">
              <div className="rounded-3xl border border-border/60 bg-card/50 p-5">
                <h3 className="font-serif text-lg text-foreground mb-3">Ürün açıklaması</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            </TabsContent>

            <TabsContent value="taksit" className="mt-6">
              <div className="rounded-3xl border border-border/60 bg-card/50 p-5 space-y-4">
                <h3 className="font-serif text-lg text-foreground">Taksit seçenekleri</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tutarlar örnektir. Bankaya ve kampanyalara göre değişebilir.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="degerlendirmeler" className="mt-6">
              <div className="rounded-3xl border border-border/60 bg-card/50 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-lg text-foreground">Değerlendirmeler</h3>
                    <p className="text-xs text-muted-foreground mt-1">Ortalama puan: 4.0 / 5</p>
                  </div>
                  <div className="flex items-center gap-1.5" aria-label="Yıldızlar">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className={i <= 4 ? "text-accent" : "text-muted-foreground/40"}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { author: "Elif K.", rating: 4, text: "Renkleri fotoğraftan daha sıcak. Çok zarif duruyor." },
                    { author: "Merve A.", rating: 4, text: "Malzeme kalitesi iyi, kullanımı rahat." },
                    { author: "Ayşe T.", rating: 3, text: "Güzel ama beklentim biraz daha yüksekti." },
                  ].map((r) => (
                    <div key={r.author} className="p-4 rounded-2xl bg-muted/25 border border-border/60">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{r.author}</p>
                        <p className="text-xs text-muted-foreground">{r.rating} / 5</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="soru" className="mt-6">
              <div className="rounded-3xl border border-border/60 bg-card/50 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-serif text-lg text-foreground">Soru cevap</h3>
                  <AskQuestionDialog productName={product.name} />
                </div>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="q1">
                    <AccordionTrigger>Ürün hangi kullanım alanlarında önerilir?</AccordionTrigger>
                    <AccordionContent>
                      Salon, giriş ve yatak odası gibi alanlarda doğal tonlarla uyumlu kombin oluşturur. Fotoğraflardaki
                      stil önerilerini kullanarak farklı dokularla eşleştirebilirsiniz.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="q2">
                    <AccordionTrigger>Kargo süresi ne kadar?</AccordionTrigger>
                    <AccordionContent>
                      Genellikle 2-4 iş günü içinde teslim süreci başlar. Yoğun dönemlerde süre uzayabilir.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="q3">
                    <AccordionTrigger>İade / değişim nasıl oluyor?</AccordionTrigger>
                    <AccordionContent>
                      14 gün içinde, ürün koşulları sağlandığı takdirde iade/değişim talebi oluşturabilirsiniz.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {related.length > 0 && (
          <section className="max-w-6xl mx-auto px-6 lg:px-8 mt-16 border-t border-border/60 pt-10">
            <header className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium mb-2">
                  Benzer ürünler
                </p>
                <h2 className="font-serif text-2xl text-foreground">Evinize uyum sağlayacak diğer parçalar</h2>
              </div>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full px-4">
                <Link href="/urunler">Tüm ürünleri gör</Link>
              </Button>
            </header>

            <div className="grid grid-cols-2 gap-4 md:gap-6 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/urunler/${item.slug}`}
                  className="group rounded-3xl border border-border/60 bg-card/80 overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-muted">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {item.category}
                    </p>
                    <h3 className="font-serif text-sm md:text-base text-foreground line-clamp-2">{item.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.shortDescription || item.description}
                    </p>
                    <span className="mt-2 text-sm font-medium text-foreground">
                      {item.price.toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
