"use client"

import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface SupportMessage {
  id: string
  senderType: "CUSTOMER" | "ADMIN"
  senderName: string
  body: string
  createdAt: string
}

export interface SupportTicket {
  id: string
  ticketNo: string
  email: string
  name: string
  subject: string
  orderNo: string | null
  status: "OPEN" | "ANSWERED" | "CLOSED"
  isReadByAdmin: boolean
  messages: SupportMessage[]
  createdAt: string
  updatedAt: string
}

export const TICKET_STATUS_TR: Record<SupportTicket["status"], string> = {
  OPEN: "Yanıt Bekliyor",
  ANSWERED: "Yanıtlandı",
  CLOSED: "Kapatıldı",
}

export const TICKET_STATUS_COLOR: Record<SupportTicket["status"], string> = {
  OPEN: "bg-amber-100 text-amber-800",
  ANSWERED: "bg-green-100 text-green-800",
  CLOSED: "bg-secondary text-muted-foreground",
}

/** Mesaj balonlari: musteri solda, isletme sagda. */
export function SupportThread({
  messages,
  adminView = false,
}: {
  messages: SupportMessage[]
  adminView?: boolean
}) {
  return (
    <div className="space-y-3">
      {messages.map((m) => {
        // Admin panelinde "biz" işletmeyiz, müşteri tarafında "biz" müşteriyiz
        const isOwn = adminView ? m.senderType === "ADMIN" : m.senderType === "CUSTOMER"
        return (
          <div key={m.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-4 py-3 sm:max-w-[75%]",
                m.senderType === "ADMIN"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card",
              )}
            >
              <p
                className={cn(
                  "mb-1 text-[11px] font-semibold",
                  m.senderType === "ADMIN"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                )}
              >
                {m.senderName} · {formatDateTime(m.createdAt)}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
