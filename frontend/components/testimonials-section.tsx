"use client"

import { useEffect, useRef } from "react"
import { ScrollBlurText } from "./scroll-blur-text"

const testimonials = [
  {
    quote:
      "Rattan sepeti beklediğimden çok daha güzel geldi. Hem salonuma harika bir dokunuş kattı hem de battaniyeleri düzenli tutmama yardımcı oldu.",
    author: "Selin K.",
    role: "Doğrulanmış alıcı",
    avatar: "/placeholder-user.jpg",
  },
  {
    quote:
      "Ahşap sehpa fotoğraftan bile daha güzel. Gerçekten masif ahşap, çok kaliteli hissettiriyor. Kesinlikle tekrar alışveriş yapacağım.",
    author: "Merve A.",
    role: "Doğrulanmış alıcı",
    avatar: "/placeholder-user.jpg",
  },
  {
    quote:
      "Krem seramik vazoyu pampas otu ile kullandım, tam hayal ettiğim gibi oldu. Hem estetik hem çok uygun fiyatlı.",
    author: "Ayşe T.",
    role: "Doğrulanmış alıcı",
    avatar: "/placeholder-user.jpg",
  },
  {
    quote:
      "Hediye için aldım, ambalajı bile çok güzeldi. Arkadaşım çok beğendi, bana da sipariş vermemi söyledi hemen.",
    author: "Deniz Y.",
    role: "Doğrulanmış alıcı",
    avatar: "/placeholder-user.jpg",
  },
  {
    quote:
      "Yeni eve taşındık ve tam ihtiyacım olan ürünleri burada buldum. Renk paleti çok uyumlu, birbirini tamamlayan ürünler almak çok kolay.",
    author: "Naz Ö.",
    role: "Doğrulanmış alıcı",
    avatar: "/placeholder-user.jpg",
  },
]

export function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

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
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    let animationId: number
    let scrollPosition = 0
    const scrollSpeed = 0.5

    const animate = () => {
      scrollPosition += scrollSpeed
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0
      }
      scrollContainer.scrollLeft = scrollPosition
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    const handleMouseEnter = () => cancelAnimationFrame(animationId)
    const handleMouseLeave = () => {
      animationId = requestAnimationFrame(animate)
    }

    scrollContainer.addEventListener("mouseenter", handleMouseEnter)
    scrollContainer.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      cancelAnimationFrame(animationId)
      scrollContainer.removeEventListener("mouseenter", handleMouseEnter)
      scrollContainer.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  const duplicatedTestimonials = [...testimonials, ...testimonials]

  return (
    <section ref={sectionRef} id="temoignages" className="py-24 bg-background overflow-hidden lg:py-32 lg:pb-0">
      <div className="w-full">
        <div className="text-center mb-16 lg:mb-20 px-6">
          <p className="reveal opacity-0 text-sm uppercase tracking-[0.2em] text-secondary font-medium mb-4">
            Müşteri Yorumları
          </p>
          <ScrollBlurText
            text="Mia Miss ile evleri güzelleşenler"
            className="font-serif text-3xl md:text-4xl text-foreground text-balance lg:text-7xl font-light"
          />
        </div>

        <div className="reveal opacity-0 animation-delay-400">
          <div ref={scrollRef} className="flex gap-6 overflow-x-hidden" style={{ scrollBehavior: "auto" }}>
            {duplicatedTestimonials.map((testimonial, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[320px] md:w-[380px] bg-card rounded-2xl p-6 border border-border/50 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 my-6 py-10"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-accent text-accent" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                <blockquote className="font-serif text-base md:text-lg text-foreground leading-relaxed mb-6">
                  "{testimonial.quote}"
                </blockquote>

                <div className="flex items-center gap-3 pt-4 border-t border-border/30">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium text-sm text-foreground">{testimonial.author}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
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
