"use client"

import { useCallback, useEffect, useState } from "react"
import { BellRing, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api, imageUrl } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

interface StockAlert {
  id: string
  email: string
  isNotified: boolean
  createdAt: string
  product?: { id: string; name: string; slug: string; stock: number; images?: { url: string }[] } | null
}

export default function AdminStockAlertsPage() {
  const [alerts, setAlerts] = useState<StockAlert[] | null>(null)

  const load = useCallback(() => {
    api<StockAlert[]>("/admin/stock-alerts")
      .then(setAlerts)
      .catch((e) => toast.error(e.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (a: StockAlert) => {
    try {
      await api(`/admin/stock-alerts/${a.id}`, { method: "DELETE" })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi")
    }
  }

  const pending = alerts?.filter((a) => !a.isNotified) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-md border border-border bg-card p-5">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p className="text-sm text-muted-foreground">
          Tükenen ürünlerde müşteriler "Gelince haber ver" ile e-postasını bırakır.
          Ürünün stoğunu 0'dan yukarı çektiğinizde bekleyen talepler{" "}
          <strong className="text-foreground">otomatik e-posta ile bilgilendirilir</strong>{" "}
          (SMTP ayarlıysa). Şu an <strong className="text-foreground">{pending.length}</strong>{" "}
          bekleyen talep var.
        </p>
      </div>

      {alerts === null ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
        </div>
      ) : alerts.length === 0 ? (
        <p className="py-24 text-center text-sm text-muted-foreground">Henüz stok talebi yok.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border bg-card">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(a.product?.images?.[0]?.url)}
                alt=""
                className="h-11 w-11 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {a.product?.name ?? "Silinmiş ürün"}
                  {a.product && (
                    <span
                      className={cn(
                        "ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        a.product.stock > 0
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800",
                      )}
                    >
                      stok: {a.product.stock}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.email} · {formatDateTime(a.createdAt)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  a.isNotified
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800",
                )}
              >
                {a.isNotified ? "Bilgilendirildi" : "Bekliyor"}
              </span>
              <button
                onClick={() => void remove(a)}
                className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive"
                aria-label="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
