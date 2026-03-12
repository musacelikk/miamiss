"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { ScrollBlurText } from "@/components/scroll-blur-text"
import { products } from "@/lib/products"

export function ProductSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-up")
          }
        })
      },
      { threshold: 0.1 },
    )

    const elements = sectionRef.current?.querySelectorAll(".reveal")
    elements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="produits" className="py-24 lg:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 lg:mb-20">
          <p className="reveal opacity-0 text-sm uppercase tracking-[0.2em] text-secondary font-medium mb-4">
            Öne Çıkan Ürünler
          </p>
          <ScrollBlurText
            text="Evinize zarif bir dokunuş"
            className="font-serif text-3xl text-foreground text-balance mb-6 md:text-7xl font-light"
          />
          <p className="reveal opacity-0 animation-delay-400 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Doğal dokular ve sıcak renk tonlarıyla seçilmiş her parça; yaşam alanlarınızı daha samimi, daha zarif ve
            daha kendinize ait hissettirmek için tasarlandı.
          </p>
        </div>

        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible -mx-6 px-6 lg:mx-0">
          {products.map((product, index) => (
            <div
              key={product.id}
              className={`reveal opacity-0 ${index === 1 ? "animation-delay-200" : index === 2 ? "animation-delay-400" : ""} group min-w-[85vw] md:min-w-[70vw] lg:min-w-0 snap-center`}
            >
              <div className="bg-card rounded-3xl overflow-hidden border border-border/50 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 flex flex-col">
                {/* Image */}
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <span className="absolute top-4 left-4 bg-background/92 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-full">
                    {product.category}
                  </span>
                </div>
                {/* Content */}
                <div className="p-6 lg:p-8 flex-1 flex flex-col">
                  <h3 className="font-serif text-foreground mb-2 text-2xl font-normal">{product.name}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6 text-sm flex-1">
                    {product.shortDescription || product.description}
                  </p>
                  <div className="flex items-center justify-between gap-4 mt-auto">
                    <span className="font-medium text-lg text-foreground">
                      {product.price.toLocaleString("tr-TR")} ₺
                    </span>
                    <Button
                      asChild
                      variant="ghost"
                      className="text-primary hover:text-primary hover:bg-primary/10 p-0 h-auto group/btn"
                    >
                      <Link href={`/urunler/${product.slug}`}>
                        İncele
                        <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <Button asChild size="lg" className="rounded-full px-8 py-6 text-base group">
            <Link href="/urunler">
              Tüm koleksiyonu gör
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
