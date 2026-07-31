"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Loader2, Plus, Star, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { api, type Product } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

interface Review {
  id: string
  rating: number
  comment: string
  isApproved: boolean
  createdAt: string
  displayName?: string | null
  user?: { name: string; email: string } | null
  product?: { name: string; slug: string } | null
}

const EMPTY_FORM = { productId: "", displayName: "", rating: 5, comment: "" }

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [onlyPending, setOnlyPending] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState<typeof EMPTY_FORM | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api<Review[]>(`/admin/reviews${onlyPending ? "?pending=true" : ""}`)
      .then(setReviews)
      .catch((e) => toast.error(e.message))
  }, [onlyPending])

  useEffect(() => {
    setReviews(null)
    load()
  }, [load])

  useEffect(() => {
    api<{ items: Product[] }>("/admin/products")
      .then((res) => setProducts(res.items))
      .catch(() => {})
  }, [])

  const saveManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setBusy(true)
    try {
      await api("/admin/reviews", {
        method: "POST",
        body: JSON.stringify({ ...form, isApproved: true }),
      })
      toast.success("Yorum eklendi ve yayınlandı")
      setForm(null)
      setOnlyPending(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eklenemedi")
    } finally {
      setBusy(false)
    }
  }

  const moderate = async (r: Review, isApproved: boolean) => {
    try {
      await api(`/admin/reviews/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isApproved }),
      })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi")
    }
  }

  const remove = async (r: Review) => {
    if (!confirm("Yorum kalıcı olarak silinsin mi?")) return
    try {
      await api(`/admin/reviews/${r.id}`, { method: "DELETE" })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setForm({ ...EMPTY_FORM })}
          className="mr-2 flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> Manuel Yorum Ekle
        </button>
        <button
          onClick={() => setOnlyPending(true)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs font-medium",
            onlyPending ? "border-primary bg-primary text-primary-foreground" : "border-border",
          )}
        >
          Onay Bekleyenler
        </button>
        <button
          onClick={() => setOnlyPending(false)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs font-medium",
            !onlyPending ? "border-primary bg-primary text-primary-foreground" : "border-border",
          )}
        >
          Tümü
        </button>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 pt-16">
          <form
            onSubmit={saveManual}
            className="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Manuel Yorum Ekle</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Ürün *</label>
                <select
                  required
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                >
                  <option value="">Ürün seçin...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Gösterilecek İsim *</label>
                <input
                  required
                  minLength={2}
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                  placeholder="Örn: Zeynep K."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Puan</label>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setForm({ ...form, rating: i + 1 })}
                      aria-label={`${i + 1} yıldız`}
                    >
                      <Star
                        className={cn(
                          "h-6 w-6",
                          i < form.rating ? "fill-accent text-accent" : "text-border",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Yorum *</label>
                <textarea
                  required
                  minLength={3}
                  rows={4}
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="h-10 rounded-md border border-border px-6 text-xs font-semibold"
              >
                Vazgeç
              </button>
              <button
                disabled={busy}
                className="flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-xs font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Ekle ve Yayınla
              </button>
            </div>
          </form>
        </div>
      )}

      {reviews === null ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="py-24 text-center text-sm text-muted-foreground">Yorum yok.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-md border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {r.displayName ?? r.user?.name ?? "Silinmiş kullanıcı"}
                    {r.displayName && (
                      <span className="ml-1.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        Manuel
                      </span>
                    )}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {r.product?.name ?? "Silinmiş ürün"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3.5 w-3.5",
                          i < r.rating ? "fill-accent text-accent" : "text-border",
                        )}
                      />
                    ))}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      r.isApproved
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {r.isApproved ? "Yayında" : "Bekliyor"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
              <div className="mt-4 flex gap-2">
                {!r.isApproved ? (
                  <button
                    onClick={() => void moderate(r, true)}
                    className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700"
                  >
                    <Check className="h-3.5 w-3.5" /> Onayla
                  </button>
                ) : (
                  <button
                    onClick={() => void moderate(r, false)}
                    className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary"
                  >
                    <X className="h-3.5 w-3.5" /> Yayından Kaldır
                  </button>
                )}
                <button
                  onClick={() => void remove(r)}
                  className="flex items-center gap-1.5 rounded-md border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
