"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import {
  SupportThread,
  TICKET_STATUS_COLOR,
  TICKET_STATUS_TR,
  type SupportTicket,
} from "@/components/site/support-thread"
import { cn } from "@/lib/utils"

const STATUSES = Object.keys(TICKET_STATUS_TR) as SupportTicket["status"][]

function TicketRow({ ticket, onChanged }: { ticket: SupportTicket; onChanged: () => void }) {
  const [open, setOpen] = useState(!ticket.isReadByAdmin)
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)

  const markRead = useCallback(() => {
    if (!ticket.isReadByAdmin) {
      void api(`/admin/support/${ticket.id}/read`, { method: "PATCH" }).then(onChanged)
    }
  }, [ticket.id, ticket.isReadByAdmin, onChanged])

  const reply = async () => {
    if (!body.trim()) return
    setBusy(true)
    try {
      await api(`/admin/support/${ticket.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      })
      toast.success("Yanıt gönderildi, müşteriye e-posta iletildi")
      setBody("")
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gönderilemedi")
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (status: string) => {
    try {
      await api(`/admin/support/${ticket.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi")
    }
  }

  return (
    <div
      className={cn(
        "rounded-md border bg-card",
        ticket.isReadByAdmin ? "border-border" : "border-accent/50",
      )}
    >
      <button
        onClick={() => {
          setOpen((v) => !v)
          if (!open) markRead()
        }}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <p className={cn("truncate", !ticket.isReadByAdmin && "font-bold")}>
            {ticket.subject}
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{ticket.ticketNo}</span> · {ticket.name} ·{" "}
            {ticket.email}
            {ticket.orderNo && ` · ${ticket.orderNo}`} · {formatDateTime(ticket.updatedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {!ticket.isReadByAdmin && (
            <span className="h-2 w-2 rounded-full bg-accent" aria-label="Okunmadı" />
          )}
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              TICKET_STATUS_COLOR[ticket.status],
            )}
          >
            {TICKET_STATUS_TR[ticket.status]}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-5">
          <SupportThread messages={ticket.messages} adminView />

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold">Yanıtınız</label>
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Müşteriye yanıtınızı yazın — e-posta ile de iletilir."
                className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={ticket.status}
                onChange={(e) => void setStatus(e.target.value)}
                className="h-11 rounded-md border border-border bg-background px-3 text-xs font-medium outline-none focus:border-accent"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TICKET_STATUS_TR[s]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void reply()}
                disabled={busy || !body.trim()}
                className="flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-accent disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Yanıtla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminSupportPage() {
  const [data, setData] = useState<{ items: SupportTicket[]; unread: number } | null>(null)
  const [status, setStatus] = useState("")

  const load = useCallback(() => {
    const q = status ? `?status=${status}` : ""
    api<{ items: SupportTicket[]; unread: number }>(`/admin/support${q}`)
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
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s === status ? "" : s)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-medium",
              status === s ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
          >
            {TICKET_STATUS_TR[s]}
          </button>
        ))}
        {data && data.unread > 0 && (
          <span className="ml-auto rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
            {data.unread} okunmamış
          </span>
        )}
      </div>

      {data === null ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
        </div>
      ) : data.items.length === 0 ? (
        <p className="py-24 text-center text-sm text-muted-foreground">Destek talebi yok.</p>
      ) : (
        <div className="space-y-3">
          {data.items.map((t) => (
            <TicketRow key={t.id} ticket={t} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  )
}
