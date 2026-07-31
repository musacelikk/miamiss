"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface PuzzleWord {
  id: string
  word: string
  hint: string
  isActive: boolean
}

export default function AdminPuzzlePage() {
  const [words, setWords] = useState<PuzzleWord[] | null>(null)
  const [word, setWord] = useState("")
  const [hint, setHint] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api<PuzzleWord[]>("/admin/puzzle-words")
      .then(setWords)
      .catch((e) => toast.error(e.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api("/admin/puzzle-words", {
        method: "POST",
        body: JSON.stringify({ word: word.trim(), hint: hint.trim() }),
      })
      toast.success("Kelime eklendi")
      setWord("")
      setHint("")
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eklenemedi")
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (w: PuzzleWord) => {
    try {
      await api(`/admin/puzzle-words/${w.id}`, {
        method: "PATCH",
        body: JSON.stringify({ word: w.word, hint: w.hint, isActive: !w.isActive }),
      })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi")
    }
  }

  const remove = async (w: PuzzleWord) => {
    if (!confirm(`"${w.word}" kelimesi silinsin mi?`)) return
    try {
      await api(`/admin/puzzle-words/${w.id}`, { method: "DELETE" })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi")
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Anasayfadaki kelime bulmacasında bu kelimelerden rastgele biri sorulur. Doğru bilen ziyaretçi
        30 günde bir kez, 7 gün geçerli tek kullanımlık <strong>%10 indirim kuponu</strong> kazanır.
      </p>

      <form onSubmit={add} className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-5">
        <div className="min-w-40 flex-1">
          <label className="mb-1.5 block text-xs font-semibold">Kelime</label>
          <input
            required
            value={word}
            onChange={(e) => setWord(e.target.value.toLocaleUpperCase("tr-TR"))}
            className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm uppercase outline-none focus:border-accent"
            placeholder="TRAVERTEN"
          />
        </div>
        <div className="min-w-60 flex-[2]">
          <label className="mb-1.5 block text-xs font-semibold">İpucu</label>
          <input
            required
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            placeholder="Koleksiyonumuzun ana malzemesi..."
          />
        </div>
        <button
          disabled={busy}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Ekle
        </button>
      </form>

      <div className="divide-y divide-border rounded-md border border-border bg-card">
        {words === null ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
          </div>
        ) : words.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Henüz kelime yok.</p>
        ) : (
          words.map((w) => (
            <div key={w.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1">
                <p className="font-mono text-sm font-bold tracking-widest">{w.word}</p>
                <p className="text-xs text-muted-foreground">{w.hint}</p>
              </div>
              <button
                onClick={() => void toggle(w)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                  w.isActive
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-secondary text-muted-foreground hover:bg-muted",
                )}
              >
                {w.isActive ? "Aktif" : "Pasif"}
              </button>
              <button
                onClick={() => void remove(w)}
                className="p-1.5 text-muted-foreground hover:text-destructive"
                aria-label="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
