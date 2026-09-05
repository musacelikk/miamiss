"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

interface ReturnRow {
  id: string
  returnNo: string
  orderNo: string
  email: string
  reason: string
  description: string
  images: string[]
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
  adminNote: string | null
  createdAt: string
  geliverShipmentId: string | null
  trackingNo: string | null
  cargoCompany: string | null
  labelUrl: string | null
  shippingError: string | null
}

const STATUS_TR: Record<ReturnRow["status"], string> = {
  PENDING: "İnceleniyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  COMPLETED: "Tamamlandı",
}

const STATUS_COLOR: Record<ReturnRow["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  COMPLETED: "bg-green-100 text-green-800",
}

function ReturnItem({ row, onChanged }: { row: ReturnRow; onChanged: () => void }) {
  const [open, setOpen] = useState(row.status === "PENDING")
  const [note, setNote] = useState(row.adminNote ?? "")
  const [busy, setBusy] = useState(false)

  const decide = async (status: ReturnRow["status"]) => {
    setBusy(true)
    try {
      await api(`/admin/returns/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNote: note }),
      })
      toast.success("İade talebi güncellendi, müşteriye e-posta gönderildi")
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi")
    } finally {
      setBusy(false)
    }
  }

  /* Otomatik oluşturma başarısız olduysa iade kargosunu elle dener */
  const createShipment = async () => {
    setBusy(true)
    try {
      await api(`/admin/returns/${row.id}/shipping`, { method: "POST" })
      toast.success("İade kargosu oluşturuldu")
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İade kargosu oluşturulamadı")
    } finally {
      setBusy(false)
    }
  }

  const cancelShipment = async () => {
    if (!confirm("İade kargosu iptal edilsin mi? Müşterinin kodu geçersiz olur.")) return
    setBusy(true)
    try {
      await api(`/admin/returns/${row.id}/shipping`, { method: "DELETE" })
      toast.success("İade kargosu iptal edildi")
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İptal edilemedi")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        "rounded-md border bg-card",
        row.status === "PENDING" ? "border-accent/50" : "border-border",
      )}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold">
            {row.returnNo}
            <span className="ml-2 font-sans font-normal text-muted-foreground">
              → {row.orderNo}
            </span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {row.email} · {row.reason} · {formatDateTime(row.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {row.images.length > 0 && (
            <span className="text-xs text-muted-foreground">{row.images.length} 📷</span>
          )}
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              STATUS_COLOR[row.status],
            )}
          >
            {STATUS_TR[row.status]}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-5">
          <p className="whitespace-pre-wrap rounded-md bg-secondary/50 p-4 text-sm leading-relaxed">
            {row.description}
          </p>

          {row.images.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {row.images.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="İade fotoğrafı"
                    className="h-24 w-24 rounded-md border border-border object-cover transition-transform hover:scale-105"
                  />
                </a>
              ))}
            </div>
          )}

          {/* İade kargosu — onayda otomatik oluşur, hata olursa elle denenir */}
          {row.trackingNo ? (
            <div className="mt-4 rounded-md border border-green-600/30 bg-green-50 p-4">
              <p className="text-xs font-semibold text-green-900">İade kargosu hazır</p>
              <p className="mt-1 font-mono text-sm font-bold">{row.trackingNo}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {row.cargoCompany ?? "—"} · müşteri bu kodu kargo şubesinde kullanır
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                {row.labelUrl && (
                  <a
                    href={row.labelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-accent underline"
                  >
                    Etiketi görüntüle
                  </a>
                )}
                <button
                  disabled={busy}
                  onClick={() => void cancelShipment()}
                  className="text-xs font-semibold text-destructive underline disabled:opacity-50"
                >
                  Kargoyu iptal et
                </button>
              </div>
            </div>
          ) : (
            row.status === "APPROVED" && (
              <div className="mt-4 rounded-md border border-border bg-secondary/40 p-4">
                <p className="text-xs font-semibold">İade kargosu yok</p>
                {row.shippingError && (
                  <p className="mt-1 text-xs text-destructive">{row.shippingError}</p>
                )}
                <button
                  disabled={busy}
                  onClick={() => void createShipment()}
                  className="mt-2.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-accent disabled:opacity-50"
                >
                  İade kargosu oluştur
                </button>
              </div>
            )
          )}

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold">
              Not (müşteriye e-postayla iletilir)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn: Ürünü orijinal kutusuyla gönderin."
              className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => void decide("APPROVED")}
              className="rounded-md bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              title="Onaylandığında iade kargosu otomatik oluşur ve kod müşteriye e-postayla gider"
            >
              Onayla (iade kargosu oluşturur)
            </button>
            <button
              disabled={busy}
              onClick={() => void decide("COMPLETED")}
              className="rounded-md bg-green-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              Tamamlandı (ücret iade edildi)
            </button>
            <button
              disabled={busy}
              onClick={() => void decide("REJECTED")}
              className="rounded-md border border-destructive/40 px-5 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
            >
              Reddet
            </button>
            {busy && <Loader2 className="h-5 w-5 animate-spin self-center text-accent" />}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminReturnsPage() {
  const [data, setData] = useState<{ items: ReturnRow[]; pending: number } | null>(null)
  const [status, setStatus] = useState("")

  const load = useCallback(() => {
    const q = status ? `?status=${status}` : ""
    api<{ items: ReturnRow[]; pending: number }>(`/admin/returns${q}`)
      .then(setData)
      .catch((e) => toast.error(e.message))
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatus("")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs font-medium",
            !status ? "border-primary bg-primary text-primary-foreground" : "border-border",
          )}
        >
          Tümü
        </button>
        {(Object.keys(STATUS_TR) as ReturnRow["status"][]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s === status ? "" : s)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-medium",
              status === s ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
          >
            {STATUS_TR[s]}
          </button>
        ))}
        {data && data.pending > 0 && (
          <span className="ml-auto rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
            {data.pending} bekleyen
          </span>
        )}
      </div>

      {data === null ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
        </div>
      ) : data.items.length === 0 ? (
        <p className="py-24 text-center text-sm text-muted-foreground">İade talebi yok.</p>
      ) : (
        <div className="space-y-3">
          {data.items.map((r) => (
            <ReturnItem key={r.id} row={r} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  )
}
