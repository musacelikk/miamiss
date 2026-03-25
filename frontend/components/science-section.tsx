"use client"

import { useEffect, useRef, useState } from "react"
import { Leaf, Package, Truck, Users } from "lucide-react"
import { ScrollBlurText } from "./scroll-blur-text"

const principles = [
  {
    number: "01",
    title: "Özenle küratörlük",
    description:
      "Her ürün, bütünsel bir ev estetiği yaratmak için uzman gözüyle seçiliyor. Gereksiz detay yok — sadece evinize değer katanlar.",
  },
  {
    number: "02",
    title: "Doğal malzemeler",
    description:
      "Rattan, masif ahşap, seramik ve doğal tekstil; hem görselliği hem de yaşam kalitesini yükseltir.",
  },
  {
    number: "03",
    title: "Uzun ömürlü tasarım",
    description:
      "Trend gelip geçer; Mia Miss parçaları kalır. Zamansız formlar ve dayanıklı malzemeler her sezon yenidir.",
  },
]

export function ScienceSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [animatedValues, setAnimatedValues] = useState<{ [key: string]: number }>({})
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-up")
            if (!hasAnimated) {
              setHasAnimated(true)
            }
          }
        })
      },
      { threshold: 0.1 },
    )

    const elements = sectionRef.current?.querySelectorAll(".reveal")
    elements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [hasAnimated])

  const animateCounter = (value: string, label: string) => {
    const numericValue = Number.parseInt(value.replace(/[^0-9]/g, ""))
    const duration = 2000
    const steps = 60
    const increment = numericValue / steps
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      const currentValue = Math.min(Math.round(increment * currentStep), numericValue)
      setAnimatedValues((prev) => ({ ...prev, [label]: currentValue }))
      if (currentStep >= steps) clearInterval(timer)
    }, duration / steps)
  }

  const formatValue = (originalValue: string, animatedValue: number | undefined) => {
    if (animatedValue === undefined) return "0"
    if (originalValue.includes("%")) return `${animatedValue}%`
    if (originalValue.includes("K+")) return `${animatedValue}K+`
    if (originalValue.includes("+")) return `${animatedValue}+`
    return `${animatedValue}`
  }

  return (
    <section ref={sectionRef} id="science" className="py-24 lg:py-32 bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 lg:mb-20">
          <p className="reveal opacity-0 text-sm uppercase tracking-[0.2em] text-primary-foreground/70 font-medium mb-4">
            Neden Mia Miss?
          </p>
          <ScrollBlurText
            text="Her parçanın arkasında bir anlayış var"
            className="font-serif text-3xl md:text-4xl text-primary-foreground text-balance mb-6 lg:text-6xl font-light"
          />
          <p className="reveal opacity-0 animation-delay-400 text-lg text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
            Rastgele doldurmak değil, bilinçli seçim yapmak. Mia Miss koleksiyonu bu prensiple kuruldu.
          </p>
        </div>

        {/* Principles */}
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {principles.map((principle, index) => (
            <div
              key={principle.number}
              className={`reveal opacity-0 ${index === 1 ? "animation-delay-200" : index === 2 ? "animation-delay-400" : ""}`}
            >
              <div className="border-t border-primary-foreground/20 pt-8">
                <span className="text-sm font-medium text-primary-foreground/50 mb-4 block">{principle.number}</span>
                <h3 className="font-serif text-xl md:text-2xl font-medium text-primary-foreground mb-4">
                  {principle.title}
                </h3>
                <p className="text-primary-foreground/70 leading-relaxed">{principle.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
