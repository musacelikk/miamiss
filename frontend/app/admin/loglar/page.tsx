"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

interface LogRow {
  id: string
  userId: string | null
  email: string | null
  actorType: "ADMIN" | "CUSTOMER" | "GUEST"
  action: string
  detail: string | null
  createdAt: string
}

const ACTOR_TR: Record<LogRow["actorType"], string> = {
  ADMIN: "Admin",
  CUSTOMER: "Üye",
  GUEST: "Misafir",
}

const ACTOR_COLOR: Record<LogRow["actorType"], string> = {
  ADMIN: "bg-violet-100 text-violet-800",
  CUSTOMER: "bg-blue-100 text-blue-800",
  GUEST: "bg-secondary text-muted-foreground",
}

const ACTION_TR: Record<string, string> = {
  "auth.login": "Giriş",
  "auth.register": "Kayıt",
  "order.create": "Sipariş",
  "order.update": "Sipariş Güncelleme",
  "order.cancel": "Sipariş İptali",
  "product.create": "Ürün Ekleme",
  "product.update": "Ürün Güncelleme",
  "product.delete": "Ürün Silme",
  "coupon.create": "Kupon Ekleme",
  "coupon.delete": "Kupon Silme",
  "user.create": "Üye Ekleme",
  "user.update": "Üye Güncelleme",
  "user.delete": "Üye Silme",
  "settings.update": "Ayar Değişikliği",
  "settings.homepage": "Anasayfa Değişikliği",
  "blog.create": "Blog Ekleme",
  "blog.update": "Blog Güncelleme",
  "blog.delete": "Blog Silme",
}

export default function AdminLogsPage() {
  const [data, setData] = useState<{ items: LogRow[]; pageCount: number; total: number } | null>(
    null,
  )
  const [actorType, setActorType] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    const q = new URLSearchParams()
    if (actorType) q.set("actorType", actorType)
    if (search) q.set("search", search)
    q.set("page", String(page))
    api<{ items: LogRow[]; pageCount: number; total: number }>(`/admin/logs?${q.toString()}`)
      .then(setData)
      .catch((e) => toast.error(e.message))
  }, [actorType, search, page])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {[
          ["", "Tümü"],
          ["ADMIN", "Admin"],
          ["CUSTOMER", "Üye"],
          ["GUEST", "Misafir"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setActorType(value)
              setPage(1)
            }}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-medium",
              actorType === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border",
            )}
          >
            {label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="E-posta veya işlem ara..."
            className="w-64 rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      {data === null ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
        </div>
      ) : data.items.length === 0 ? (
        <p className="py-24 text-center text-sm text-muted-foreground">Kayıt bulunamadı.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Zaman</th>
                  <th className="px-4 py-3">Kim</th>
                  <th className="px-4 py-3">İşlem</th>
                  <th className="px-4 py-3">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((l) => (
                  <tr key={l.id} className="hover:bg-secondary/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                      {formatDateTime(l.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          ACTOR_COLOR[l.actorType],
                        )}
                      >
                        {ACTOR_TR[l.actorType]}
                      </span>
                      <span className="text-xs">{l.email ?? "—"}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold">
                      {ACTION_TR[l.action] ?? l.action}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{l.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pageCount > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border disabled:opacity-40"
                aria-label="Önceki"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                Sayfa {page} / {data.pageCount} ({data.total} kayıt)
              </span>
              <button
                disabled={page >= data.pageCount}
                onClick={() => setPage(page + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border disabled:opacity-40"
                aria-label="Sonraki"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
