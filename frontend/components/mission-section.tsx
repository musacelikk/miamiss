"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function MissionSection() {
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
    <section ref={sectionRef} id="mission" className="py-24 lg:py-32 px-6">
      <div className="relative max-w-7xl mx-auto rounded-[48px] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="/images/spacejoy-YI2YkyaREHk-unsplash.jpg"
            alt="Mia Miss ev dekorasyon atmosferi"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-foreground/55" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-background/0 to-transparent backdrop-blur-[2px]" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-background/0 to-transparent backdrop-blur-[8px] opacity-60" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-background/0 to-transparent backdrop-blur-[20px] opacity-30" />
        </div>

        <div className="relative px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="reveal opacity-0 order-2 lg:order-1" />

            <div className="order-1 lg:order-2">
              <p className="reveal opacity-0 text-sm uppercase tracking-[0.2em] text-accent font-medium mb-4">
                Mia Miss Hakkında
              </p>
              <h2 className="reveal opacity-0 animation-delay-200 font-serif text-3xl md:text-4xl lg:text-5xl font-medium text-background text-balance mb-8">
                Eviniz sizi yansıtmalı
              </h2>
              <div className="reveal opacity-0 animation-delay-400 space-y-6 text-background/90 leading-relaxed">
                <p>
                  Mia Miss, evinizin her köşesinin size ait hissettirmesi gerektiğine inanıyor. Çünkü bir mekânın
                  ruhu, orada yaşayan insanın tercihlerinden, dokunuşlarından ve hikâyesinden doğar.
                </p>
                <p>
                  Koleksiyonumuzu oluştururken sadece "güzel görünüyor" demek yetmez; her parçanın işlevsel, kaliteli
                  ve uzun ömürlü olması gerekir. Doğal malzemelere olan bağlılığımız, evinize getirdiğiniz her
                  nesnenin doğayla uyum içinde olmasını sağlar.
                </p>
              </div>
              <div className="reveal opacity-0 animation-delay-600 mt-10">
                <Button
                  asChild
                  size="lg"
                  className="bg-background text-foreground hover:bg-background/90 rounded-full px-8 group"
                >
                  <Link href="/urunler">
                    Koleksiyonu keşfet
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
