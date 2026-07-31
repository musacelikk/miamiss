"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatDateTime, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

interface GiftCard {
  id: string
  code: string
  initialAmount: number
  balance: number
  status: "PENDING" | "ACTIVE" | "DEPLETED" | "DISABLED"
  purchaserEmail: string | null
  recipientName: string | null
  recipientEmail: string | null
  message: string | null
  expiresAt: string | null
  createdAt: string
}

const STATUS_TR: Record<GiftCard["status"], string> = {
  PENDING: "Ödeme Bekliyor",
  ACTIVE: "Aktif",
  DEPLETED: "Tükendi",
  DISABLED: "Devre Dışı",
}

const STATUS_COLOR: Record<GiftCard["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-green-100 text-green-800",
  DEPLETED: "bg-secondary text-muted-foreground",
  DISABLED: "bg-red-100 text-red-800",
}

export default function AdminGiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[] | null>(null)

  const load = useCallback(() => {
    api<GiftCard[]>("/admin/gift-cards")
      .then(setCards)
      .catch((e) => toast.error(e.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (card: GiftCard, status: GiftCard["status"]) => {
    try {
      await api(`/admin/gift-cards/${card.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
      toast.success("Durum güncellendi")
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi")
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Hediye kartları sipariş üzerinden satın alınır; sipariş ödemesi "Ödendi" yapılınca otomatik
        aktifleşir. Gerekirse buradan manuel durum değiştirebilirsiniz.
      </p>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">Bakiye</th>
              <th className="px-4 py-3">Satın Alan</th>
              <th className="px-4 py-3">Alıcı</th>
              <th className="px-4 py-3">Geçerlilik</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cards === null ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                </td>
              </tr>
            ) : cards.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Henüz hediye kartı satın alınmadı.
                </td>
              </tr>
            ) : (
              cards.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{c.code}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">{formatPrice(c.balance)}</span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      / {formatPrice(c.initialAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.purchaserEmail ?? "—"}
                    <br />
                    {formatDateTime(c.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.recipientName ?? "—"}
                    {c.recipientEmail && (
                      <>
                        <br />
                        {c.recipientEmail}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.expiresAt ? formatDateTime(c.expiresAt) : "Süresiz"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      onChange={(e) => void setStatus(c, e.target.value as GiftCard["status"])}
                      className={cn(
                        "rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold outline-none",
                        STATUS_COLOR[c.status],
                      )}
                    >
                      {(Object.keys(STATUS_TR) as GiftCard["status"][]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_TR[s]}
                        </option>
                      ))}
                    </select>
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
