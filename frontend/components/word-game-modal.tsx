"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function WordGameModal() {
  const [open, setOpen] = useState(false)
  const [guess, setGuess] = useState("")
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mia-word-game-btn fixed bottom-24 -right-10 lg:-right-6 xl:right-0  z-50 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-primary-foreground transform -rotate-90 origin-center shadow-lg"
          aria-label="Kelime oyunu"
        >
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <span aria-hidden>✨</span>
            <span className="text-sm sm:text-base">Kelime oyunu</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 -rotate-90" />
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="bg-primary text-primary-foreground border-primary-foreground/20 p-6 sm:p-8 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Kelime oyunu</DialogTitle>
          <p className="text-sm text-primary-foreground/80 mt-2">
            Kelimeyi tahmin et: doğru cevabı bulursan <span className="font-semibold">%20</span> indirim kazanırsın.
          </p>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-primary-foreground/90">
            M _ _ _ _ _
          </p>

          <form
            className="flex flex-col sm:flex-row gap-2"
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
              className="rounded-full px-6 bg-background text-foreground hover:bg-background/90"
            >
              Tahmin et
            </Button>
          </form>

          {status === "success" && (
            <p className="text-xl text-[#e0d0bd]">
              Tebrikler! Örnek indirim kodu: <span className="font-mono font-bold tracking-wide text-2xl text-[#d0a27f]">MIA20</span>
            </p>
          )}

          {status === "error" && (
            <p className="text-xs text-red-100">
              Bu kez olmadı, tekrar deneyin. Küçük harf/büyük harf önemli değil.
            </p>
          )}

          <p className="text-xs text-primary-foreground/75">
            İpucu: Markamızın adından ilham alın.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

