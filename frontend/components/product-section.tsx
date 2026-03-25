"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ChevronLeft, ChevronRight, Heart, InfoIcon, ShoppingCart } from "lucide-react"
import { ScrollBlurText } from "@/components/scroll-blur-text"
import { products } from "@/lib/products"

export function ProductSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

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

        <div className="relative">
          {/* Side gradient hints */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 z-10" />

          {/* Scroll buttons */}
          <button
            type="button"
            onClick={() => scrollerRef.current?.scrollBy({ left: -420, behavior: "smooth" })}
            className="hidden sm:flex items-center justify-center absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 border border-border/50 shadow-sm hover:bg-background z-20"
            aria-label="Geri"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollerRef.current?.scrollBy({ left: 420, behavior: "smooth" })}
            className="hidden sm:flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 border border-border/50 shadow-sm hover:bg-background z-20"
            aria-label="İleri"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div
            ref={scrollerRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-6 px-6 lg:mx-0 cursor-grab active:cursor-grabbing"
          >
          {products.map((product, index) => (
            <div
              key={product.id}
              className={`reveal opacity-0 ${index === 1 ? "animation-delay-200" : index === 2 ? "animation-delay-400" : ""} group min-w-[85vw] sm:min-w-[320px] md:min-w-[360px] lg:min-w-[380px] snap-center`}
            >
              <div className="bg-card rounded-3xl overflow-hidden border border-border/50 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 flex flex-col">
                {/* Image */}
                <Link
                  href={`/urunler/${product.slug}`}
                  className="block relative aspect-[4/5] overflow-hidden bg-muted"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <span className="absolute top-4 left-4 bg-background/92 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-full">
                    {product.category}
                  </span>
                </Link>
                {/* Content */}
                <div className="p-4 lg:p-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="font-serif text-foreground text-lg font-normal">{product.name}</h3>
                    <span className="font-medium text-lg text-foreground">
                      {product.price.toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 mt-auto">
                    <div>
                    <Button
                      variant="ghost"
                      className="text-primary hover:text-primary hover:bg-primary/10 p-2 h-auto group/btn text-foreground cursor-pointer"
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                    </div>
                    <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      className="text-foreground hover:text-foreground hover:bg-foreground/10 p-2 h-auto group/btn bg-[#d3a27f] text-primary-foreground cursor-pointer"
                    >
                      Hemen Al
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-primary hover:text-primary hover:bg-primary/10 p-2 h-auto group/btn bg-primary text-primary-foreground cursor-pointer"
                    >
                      Sepete Ekle
                    </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </section>
  )
}
