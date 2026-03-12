"use client"

import { useEffect, useRef, useState } from "react"
import { Leaf, Package, Truck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollBlurText } from "./scroll-blur-text"

const stats = [
  { icon: Package, value: "500+", label: "Ürün çeşidi" },
  { icon: Leaf, value: "100%", label: "Doğal malzeme odaklı" },
  { icon: Truck, value: "2-4", label: "Gün kargo süresi" },
  { icon: Users, value: "10K+", label: "Mutlu müşteri" },
]

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
  const [guess, setGuess] = useState("")
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-up")
            if (!hasAnimated) {
              setHasAnimated(true)
              stats.forEach((stat) => {
                animateCounter(stat.value, stat.label)
              })
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

        {/* Kelimeyi Bil oyunu */}
        <div className="reveal opacity-0 animation-delay-200 mb-14 max-w-2xl mx-auto">
          <div className="rounded-3xl border border-primary-foreground/15 bg-primary-foreground/5 px-6 py-5 lg:px-8 lg:py-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.25em] uppercase mb-2">Kelimeyi bil, indirimi kap</p>
              <p className="font-serif text-lg text-primary-foreground/95">
                <span className="mr-2 font-mono tracking-[0.4em]">M _ _ _ _ _</span>
                kelimeyi doğru tahmin et, <span className="font-semibold">%20 indirim</span> kazan.
              </p>
              <p className="text-xs text-primary-foreground/75 mt-1">
                İpucu: Markamızın adından ilham alın.
              </p>
            </div>
            <form
              className="mt-3 lg:mt-0 flex flex-col sm:flex-row gap-2 w-full lg:w-auto"
              onSubmit={(e) => {
                e.preventDefault()
                const normalized = guess.trim().toLowerCase()
                if (!normalized) return
                if (normalized === "miamiss" || normalized === "mia miss") {
                  setStatus("success")
                } else {
                  setStatus("error")
                }
              }}
            >
              <input
                type="text"
                placeholder="Kelime tahmininiz"
                value={guess}
                onChange={(e) => {
                  setGuess(e.target.value)
                  setStatus("idle")
                }}
                className="flex-1 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-4 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/40"
              />
              <Button
                type="submit"
                size="sm"
                className="rounded-full px-5 whitespace-nowrap bg-background text-foreground hover:bg-background/90"
              >
                Tahmin et
              </Button>
            </form>
          </div>
          {status === "success" && (
            <p className="mt-2 text-xs text-emerald-100">
              Tebrikler! Kelimeyi doğru bildiniz. Örnek indirim kodu:{" "}
              <span className="font-mono font-semibold tracking-wide">MIA20</span>
            </p>
          )}
          {status === "error" && (
            <p className="mt-2 text-xs text-red-100">Bu kez olmadı, tekrar deneyin. Küçük harf/büyük harf önemli değil.</p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="reveal opacity-0 animation-delay-400 grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="font-serif text-4xl md:text-5xl font-medium text-primary-foreground mb-2">
                {formatValue(stat.value, animatedValues[stat.label])}
              </div>
              <div className="text-sm text-primary-foreground/70">{stat.label}</div>
            </div>
          ))}
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
