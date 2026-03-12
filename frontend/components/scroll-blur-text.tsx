"use client"

import { useEffect, useRef, useState } from "react"

interface ScrollBlurTextProps {
  text: string
  className?: string
  startBlur?: number
  endBlur?: number
}

export function ScrollBlurText({ text, className = "", startBlur = 80, endBlur = 0 }: ScrollBlurTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [wordProgress, setWordProgress] = useState<number[]>([])

  const words = text.split(" ")

  useEffect(() => {
    if (!containerRef.current) return

    // Başta tüm kelimeler blur'lu başlasın
    setWordProgress(words.map(() => 0))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Görünüme girdiğinde tüm kelimeleri netleştir
            setWordProgress(words.map(() => 1))
            observer.disconnect()
          }
        })
      },
      { threshold: 0.2 },
    )

    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [words.length])

  return (
    <h2 ref={containerRef} className={className}>
      {words.map((word, index) => {
        const progress = wordProgress[index] || 0
        const blur = startBlur - (startBlur - endBlur) * progress
        const opacity = progress

        return (
          <span
            key={index}
            style={{
              filter: `blur(${blur}px)`,
              opacity,
              display: "inline-block",
              transition: "filter 0.3s ease-out, opacity 0.3s ease-out",
            }}
          >
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </span>
        )
      })}
    </h2>
  )
}
