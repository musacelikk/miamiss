"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatDateTime, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

interface Coupon {
  id: string
  code: string
  type: "PERCENT" | "FIXED"
  value: number
  minOrderTotal: number | null
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  source: "ADMIN" | "PUZZLE"
  createdAt: string
}

const EMPTY = {
  code: "",
  type: "PERCENT" as "PERCENT" | "FIXED",
  value: "",
  minOrderTotal: "",
  maxUses: "",
  expiresAt: "",
  isActive: true,
}

type FormState = typeof EMPTY & { id?: string }

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api<Coupon[]>("/admin/coupons")
      .then(setCoupons)
      .catch((e) => toast.error(e.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setBusy(true)
    try {
      const payload = {
        code: form.code,
        type: form.type,
        value: parseFloat(form.value),
        minOrderTotal: form.minOrderTotal ? parseFloat(form.minOrderTotal) : null,
        maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
        expiresAt: form.expiresAt || null,
        isActive: form.isActive,
      }
      if (form.id) {
        await api(`/admin/coupons/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      } else {
        await api("/admin/coupons", { method: "POST", body: JSON.stringify(payload) })
      }
      toast.success("Kupon kaydedildi")
      setForm(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (c: Coupon) => {
    if (!confirm(`"${c.code}" kuponu silinsin mi?`)) return
    try {
      await api(`/admin/coupons/${c.id}`, { method: "DELETE" })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi")
    }
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Bulmaca kazanımları otomatik oluşur; buradan manuel kupon da tanımlayabilirsiniz.
        </p>
        <button
          onClick={() => setForm({ ...EMPTY })}
          className="flex h-10 shrink-0 items-center gap-2 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> Yeni Kupon
        </button>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 pt-16">
          <form
            onSubmit={save}
            className="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{form.id ? "Kuponu Düzenle" : "Yeni Kupon"}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Kod *</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className={cn(input, "font-mono uppercase")}
                  placeholder="YAZ2026"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Tip *</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as "PERCENT" | "FIXED" })
                  }
                  className={input}
                >
                  <option value="PERCENT">Yüzde (%)</option>
                  <option value="FIXED">Sabit Tutar (TL)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  Değer * {form.type === "PERCENT" ? "(%)" : "(TL)"}
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Min. Sepet (TL)</label>
                <input
                  type="number"
                  min="0"
                  value={form.minOrderTotal}
                  onChange={(e) => setForm({ ...form, minOrderTotal: e.target.value })}
                  className={input}
                  placeholder="Sınırsız"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Kullanım Limiti</label>
                <input
                  type="number"
                  min="1"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  className={input}
                  placeholder="Sınırsız"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Son Geçerlilik</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className={input}
                />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Aktif
              </label>
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
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">İndirim</th>
              <th className="px-4 py-3">Min. Sepet</th>
              <th className="px-4 py-3">Kullanım</th>
              <th className="px-4 py-3">Geçerlilik</th>
              <th className="px-4 py-3">Kaynak</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {coupons === null ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  Kupon yok.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.type === "PERCENT" ? `%${c.value}` : formatPrice(c.value)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.minOrderTotal ? formatPrice(c.minOrderTotal) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.usedCount}
                    {c.maxUses ? ` / ${c.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.expiresAt ? formatDateTime(c.expiresAt) : "Süresiz"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        c.source === "PUZZLE"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {c.source === "PUZZLE" ? "Bulmaca" : "Admin"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        c.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {c.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() =>
                          setForm({
                            id: c.id,
                            code: c.code,
                            type: c.type,
                            value: String(c.value),
                            minOrderTotal: c.minOrderTotal ? String(c.minOrderTotal) : "",
                            maxUses: c.maxUses ? String(c.maxUses) : "",
                            expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
                            isActive: c.isActive,
                          })
                        }
                        className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-accent"
                        aria-label="Düzenle"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void remove(c)}
                        className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                        aria-label="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
