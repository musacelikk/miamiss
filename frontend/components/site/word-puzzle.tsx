"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy, Delete, Gift, RotateCcw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface PuzzleData {
  available: boolean
  wordId?: string
  hint?: string
  length?: number
  letters?: string[]
}

function sessionKey(): string {
  const KEY = "miamiss_puzzle_session"
  let key = localStorage.getItem(KEY)
  if (!key) {
    key = `pz-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(KEY, key)
  }
  return key
}

export function WordPuzzle() {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null)
  const [picked, setPicked] = useState<number[]>([]) // secilen harf indexleri
  const [busy, setBusy] = useState(false)
  const [won, setWon] = useState<{ code: string; value: number } | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => {
    setPicked([])
    api<PuzzleData>("/puzzle", { auth: false })
      .then(setPuzzle)
      .catch(() => setPuzzle({ available: false }))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!puzzle?.available || !puzzle.letters) return null

  const answer = picked.map((i) => puzzle.letters![i]).join("")

  const submit = async () => {
    if (!puzzle.wordId || busy) return
    setBusy(true)
    try {
      const res = await api<{ code: string; value: number }>("/puzzle/claim", {
        method: "POST",
        body: JSON.stringify({
          wordId: puzzle.wordId,
          answer,
          sessionKey: sessionKey(),
        }),
      })
      setWon(res)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cevap yanlış, tekrar dene!")
      setPicked([])
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!won) return
    await navigator.clipboard.writeText(won.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-3 flex items-center justify-center gap-2 sm:mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Kelime Oyunu
          </p>
          <h2 className="font-display text-[1.75rem] leading-tight sm:text-4xl lg:text-5xl">
            Kelimeyi Bul, <span className="italic text-accent">%10 İndirim</span> Kazan
          </h2>

          {won ? (
            <div className="mt-10 rounded-lg border border-accent/40 bg-primary-foreground/5 p-8 backdrop-blur">
              <Gift className="mx-auto mb-4 h-10 w-10 text-accent" />
              <p className="text-sm text-primary-foreground/80">
                Tebrikler! %{won.value} indirim kodun hazır — 7 gün geçerli, sepette kullan:
              </p>
              <button
                onClick={copy}
                className="mt-4 inline-flex items-center gap-3 rounded-md border border-accent bg-accent/10 px-6 py-3 font-mono text-lg font-bold tracking-widest text-accent transition-colors hover:bg-accent/20"
              >
                {won.code}
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <>
              <p className="mt-4 text-sm text-primary-foreground/70">
                İpucu: <span className="italic">{puzzle.hint}</span>
              </p>

              {/* Cevap kutuları */}
              <div className="mt-7 flex flex-wrap items-center justify-center gap-1.5 sm:mt-8 sm:gap-2">
                {Array.from({ length: puzzle.length ?? 0 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex h-11 w-8 items-center justify-center rounded-md border text-lg font-bold sm:h-14 sm:w-12 sm:text-xl",
                      picked[i] != null
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-primary-foreground/20 bg-primary-foreground/5",
                    )}
                  >
                    {picked[i] != null ? puzzle.letters![picked[i]] : ""}
                  </div>
                ))}
              </div>

              {/* Harfler */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 sm:mt-6 sm:gap-2">
                {puzzle.letters.map((letter, i) => {
                  const used = picked.includes(i)
                  return (
                    <button
                      key={i}
                      disabled={used || picked.length >= (puzzle.length ?? 0)}
                      onClick={() => setPicked((p) => [...p, i])}
                      className={cn(
                        "h-11 w-10 rounded-md border text-lg font-semibold transition-all sm:h-12 sm:w-12",
                        used
                          ? "border-primary-foreground/10 bg-transparent text-primary-foreground/20"
                          : "border-primary-foreground/25 bg-primary-foreground/10 hover:border-accent hover:text-accent active:scale-95",
                      )}
                    >
                      {letter}
                    </button>
                  )
                })}
              </div>

              <div className="mt-7 flex items-center justify-center gap-2 sm:mt-8 sm:gap-3">
                <button
                  onClick={() => setPicked((p) => p.slice(0, -1))}
                  disabled={!picked.length}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-md border border-primary-foreground/25 px-3.5 text-sm transition-colors hover:border-primary-foreground/50 disabled:opacity-40 sm:px-4"
                >
                  <Delete className="h-4 w-4" /> Sil
                </button>
                <button
                  onClick={submit}
                  disabled={picked.length !== (puzzle.length ?? 0) || busy}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-accent-foreground transition-all hover:brightness-110 disabled:opacity-40 sm:flex-none sm:px-8"
                >
                  {busy ? "Kontrol ediliyor..." : "Kontrol Et"}
                </button>
                <button
                  onClick={load}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-primary-foreground/25 transition-colors hover:border-primary-foreground/50"
                  aria-label="Yeni kelime"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
