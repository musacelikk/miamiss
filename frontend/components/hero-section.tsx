"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { AnimatedText } from "@/components/animated-text"

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)

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

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return
      const scrollY = window.scrollY
      const sectionHeight = sectionRef.current.offsetHeight
      const progress = Math.min(scrollY / (sectionHeight * 0.5), 1)
      setScrollProgress(progress)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scale = 1 - scrollProgress * 0.05
  const borderRadius = scrollProgress * 32

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* Background image */}
      <div
        ref={imageContainerRef}
        className="absolute inset-0 w-full h-full overflow-hidden transition-transform duration-100"
        style={{ transform: `scale(${scale})`, borderRadius: `${borderRadius}px` }}
      >
        <img
          src="/images/spacejoy-YI2YkyaREHk-unsplash.jpg"
          alt="Mia Miss ev dekorasyon koleksiyonu"
          className="w-full h-full object-cover animate-zoom-in"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/65 via-foreground/35 to-foreground/10" />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-32 w-full">
        <div className="max-w-3xl">
          <p className="reveal opacity-0 text-xs sm:text-sm uppercase tracking-[0.25em] text-background/80 font-medium mb-4 sm:mb-6">
            Ev Dekorasyon & Aksesuar
          </p>
          <h1 className="mb-6 sm:mb-8">
            <AnimatedText
              text="Eviniz"
              delay={0.2}
              className="block font-serif text-4xl md:text-5xl lg:text-6xl font-medium leading-tight text-background"
            />
            <AnimatedText
              text="Sizin Sanat Eseriniz"
              delay={0.5}
              className="block font-serif text-4xl md:text-5xl lg:text-6xl font-medium leading-tight text-accent"
            />
          </h1>
          <p className="reveal opacity-0 animation-delay-400 text-sm sm:text-base lg:text-lg text-background/85 leading-relaxed mb-8 sm:mb-10">
            Sınırlı sayıda üretilen vazo ve dekoratif objelerle evinizdeki hikâyeyi yeniden yazın.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base group"
            >
              <Link href="/urunler">
                Koleksiyonu keşfet
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base border-background/40 hover:bg-background/15 text-background bg-transparent backdrop-blur-sm"
            >
              <Link href="#mission">Mia Miss hakkında</Link>
            </Button>
          </div>

          {/* Floating trust badges */}
          <div className="reveal opacity-0 animation-delay-600 flex flex-wrap gap-4 sm:gap-6 mt-8 sm:mt-12">
            {[
              { value: "50+", label: "Ürün çeşidi" },
              { value: "10K+", label: "Mutlu müşteri" },
              { value: "2-4 gün", label: "Kargo süresi" },
            ].map((badge) => (
              <div key={badge.label} className="flex flex-col">
                <span className="font-serif text-xl sm:text-2xl text-background font-medium">{badge.value}</span>
                <span className="text-[10px] sm:text-xs text-background/70 uppercase tracking-wider">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
