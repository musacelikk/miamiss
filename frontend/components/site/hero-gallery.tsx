"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { imageUrl } from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * Mobil hero galerisi: tam genislikte, parmakla kaydirilabilir,
 * kendi kendine ilerleyen tek gorsel akisi. Kullanici dokununca durur.
 */
export function HeroGallery({ images, badge }: { images: string[]; badge?: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback((index: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (paused || images.length < 2) return
    const timer = setInterval(() => {
      const el = trackRef.current
      if (!el) return
      const current = Math.round(el.scrollLeft / el.clientWidth)
      goTo((current + 1) % images.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [paused, images.length, goTo])

  const handleScroll = () => {
    const el = trackRef.current
    if (!el) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onPointerDown={() => setPaused(true)}
        className="flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <div key={`${src}-${i}`} className="relative aspect-[4/5] w-full shrink-0 snap-center">
            <Image
              src={imageUrl(src)}
              alt="Miamisu Home"
              fill
              sizes="100vw"
              priority={i === 0}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Alttan yumusak gecis + rozet */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
      {badge && (
        <span className="absolute left-4 top-4 rounded-full border border-accent/50 bg-background/85 px-4 py-1.5 font-display text-sm italic text-accent backdrop-blur">
          {badge}
        </span>
      )}

      {/* Nokta göstergeler */}
      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setPaused(true)
                goTo(i)
              }}
              aria-label={`${i + 1}. görsel`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === active ? "w-6 bg-accent" : "w-1.5 bg-foreground/25",
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
