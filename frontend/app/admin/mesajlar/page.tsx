"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Mail, MailOpen, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  isRead: boolean
  createdAt: string
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null)

  const load = useCallback(() => {
    api<ContactMessage[]>("/admin/contact-messages")
      .then(setMessages)
      .catch((e) => toast.error(e.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const markRead = async (m: ContactMessage) => {
    if (m.isRead) return
    try {
      await api(`/admin/contact-messages/${m.id}/read`, { method: "PATCH" })
      load()
    } catch {
      /* kritik degil */
    }
  }

  const remove = async (m: ContactMessage) => {
    if (!confirm("Mesaj silinsin mi?")) return
    try {
      await api(`/admin/contact-messages/${m.id}`, { method: "DELETE" })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi")
    }
  }

  return (
    <div className="space-y-3">
      {messages === null ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
        </div>
      ) : messages.length === 0 ? (
        <p className="py-24 text-center text-sm text-muted-foreground">Mesaj yok.</p>
      ) : (
        messages.map((m) => (
          <details
            key={m.id}
            onToggle={(e) => (e.target as HTMLDetailsElement).open && void markRead(m)}
            className={cn(
              "group rounded-md border bg-card",
              m.isRead ? "border-border" : "border-accent/50 bg-secondary/40",
            )}
          >
            <summary className="flex cursor-pointer items-center gap-3 px-5 py-4">
              {m.isRead ? (
                <MailOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Mail className="h-4 w-4 shrink-0 text-accent" />
              )}
              <div className="flex-1">
                <p className={cn("text-sm", !m.isRead && "font-bold")}>
                  {m.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {m.subject || "Konu yok"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.email} · {formatDateTime(m.createdAt)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  void remove(m)
                }}
                className="p-1.5 text-muted-foreground hover:text-destructive"
                aria-label="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </summary>
            <div className="border-t border-border px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {m.message}
              </p>
              <a
                href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject ?? "Miamisu Home"}`)}`}
                className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-accent"
              >
                E-posta ile Yanıtla
              </a>
            </div>
          </details>
        ))
      )}
    </div>
  )
}
