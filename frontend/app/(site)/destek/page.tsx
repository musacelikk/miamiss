"use client"

import Link from "next/link"
import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Headset, Loader2, MessageSquarePlus, Search, Send } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { useAuth } from "@/components/providers"
import {
  SupportThread,
  TICKET_STATUS_COLOR,
  TICKET_STATUS_TR,
  type SupportTicket,
} from "@/components/site/support-thread"
import { cn } from "@/lib/utils"
import { sanitizeName } from "@/lib/input"

const EMPTY = { name: "", email: "", subject: "", orderNo: "", message: "" }

function SupportContent() {
  const params = useSearchParams()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [reply, setReply] = useState<Record<string, string>>({})

  // Misafir takibi
  const [trackNo, setTrackNo] = useState("")
  const [trackEmail, setTrackEmail] = useState("")
  const [guestTicket, setGuestTicket] = useState<SupportTicket | null>(null)

  const loadMine = useCallback(() => {
    if (!user) {
      setTickets([])
      return
    }
    api<SupportTicket[]>("/support/mine")
      .then(setTickets)
      .catch(() => setTickets([]))
  }, [user])

  useEffect(() => {
    loadMine()
  }, [loadMine])

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email }))
  }, [user])

  // Siparis kartindaki "Canli Destek" butonuyla gelindiyse formu doldurup ac
  useEffect(() => {
    const orderNo = params.get("siparis")
    if (orderNo) {
      setForm((f) => ({
        ...f,
        orderNo: orderNo.toUpperCase(),
        subject: f.subject || `${orderNo.toUpperCase()} numaralı siparişim hakkında`,
      }))
      setShowForm(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await api<{ ticketNo: string }>("/support", {
        method: "POST",
        body: JSON.stringify(form),
      })
      toast.success(`Talebiniz oluşturuldu — ${res.ticketNo}`)
      setForm({ ...EMPTY, name: user?.name ?? "", email: user?.email ?? "" })
      setShowForm(false)
      loadMine()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Talep oluşturulamadı")
    } finally {
      setBusy(false)
    }
  }

  const sendReply = async (ticketId: string) => {
    const body = (reply[ticketId] ?? "").trim()
    if (!body) return
    try {
      await api(`/support/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      })
      setReply((r) => ({ ...r, [ticketId]: "" }))
      loadMine()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mesaj gönderilemedi")
    }
  }

  const trackGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api<SupportTicket>(
        `/support/track?ticketNo=${encodeURIComponent(trackNo)}&email=${encodeURIComponent(trackEmail)}`,
        { auth: false },
      )
      setGuestTicket(res)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Talep bulunamadı")
    }
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="text-center">
        <Headset className="mx-auto h-10 w-10 text-accent" strokeWidth={1.3} />
        <p className="eyebrow mb-2 mt-4">Destek</p>
        <h1 className="font-display text-3xl sm:text-4xl">Size Yardımcı Olalım</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Siparişiniz, ürünlerimiz veya iade süreciyle ilgili her konuda bize yazın.
          Talebinizi buradan takip edip yanıtlayabilirsiniz.
        </p>
      </div>

      {/* Yeni talep */}
      <div className="mt-8">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
          >
            <MessageSquarePlus className="h-4 w-4" /> Yeni Destek Talebi Oluştur
          </button>
        ) : (
          <form onSubmit={createTicket} className="rounded-md border border-border bg-card p-6">
            <h2 className="font-display text-xl">Yeni Talep</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Adınız *</label>
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: sanitizeName(e.target.value) })}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">E-posta *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Konu *</label>
                <input
                  required
                  minLength={3}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className={input}
                  placeholder="Kargo, iade, ürün sorusu..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  Sipariş No (varsa)
                </label>
                <input
                  value={form.orderNo}
                  onChange={(e) => setForm({ ...form, orderNo: e.target.value.toUpperCase() })}
                  className={cn(input, "font-mono")}
                  placeholder="MIA-XXXXXXXX"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold">Mesajınız *</label>
                <textarea
                  required
                  minLength={5}
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className={input}
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                disabled={busy}
                className="flex h-11 items-center gap-2 rounded-md bg-primary px-7 text-sm font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Gönder
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-11 rounded-md border border-border px-6 text-sm font-semibold"
              >
                Vazgeç
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Üye talepleri */}
      {user ? (
        <div className="mt-10">
          <h2 className="font-display text-2xl">Taleplerim</h2>
          {tickets === null ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Henüz destek talebiniz yok.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {tickets.map((t) => (
                <div key={t.id} className="rounded-md border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <p className="font-semibold">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{t.ticketNo}</span> · {formatDate(t.createdAt)}
                        {t.orderNo && ` · Sipariş: ${t.orderNo}`}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        TICKET_STATUS_COLOR[t.status],
                      )}
                    >
                      {TICKET_STATUS_TR[t.status]}
                    </span>
                  </div>

                  <div className="py-4">
                    <SupportThread messages={t.messages} />
                  </div>

                  {t.status !== "CLOSED" && (
                    <div className="flex gap-2">
                      <input
                        value={reply[t.id] ?? ""}
                        onChange={(e) => setReply((r) => ({ ...r, [t.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            void sendReply(t.id)
                          }
                        }}
                        placeholder="Yanıtınızı yazın..."
                        className={input}
                      />
                      <button
                        onClick={() => void sendReply(t.id)}
                        className="flex h-[42px] w-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-accent"
                        aria-label="Gönder"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Misafir takibi */
        <div className="mt-10 rounded-md border border-border bg-card p-6">
          <p className="flex items-center gap-2 font-display text-xl">
            <Search className="h-4 w-4 text-accent" /> Talebimi Sorgula
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Üye değilseniz talep numaranız ve e-postanızla durumu görüntüleyebilirsiniz.{" "}
            <Link href="/giris" className="text-accent hover:underline">
              Giriş yaparsanız
            </Link>{" "}
            tüm talepleriniz burada listelenir.
          </p>
          <form onSubmit={trackGuest} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              required
              value={trackNo}
              onChange={(e) => setTrackNo(e.target.value.toUpperCase())}
              placeholder="DST-XXXXXX"
              className={cn(input, "font-mono sm:w-44")}
            />
            <input
              required
              type="email"
              value={trackEmail}
              onChange={(e) => setTrackEmail(e.target.value)}
              placeholder="ornek@eposta.com"
              className={input}
            />
            <button className="h-11 shrink-0 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-accent">
              Sorgula
            </button>
          </form>

          {guestTicket && (
            <div className="mt-6 border-t border-border pt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">{guestTicket.subject}</p>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    TICKET_STATUS_COLOR[guestTicket.status],
                  )}
                >
                  {TICKET_STATUS_TR[guestTicket.status]}
                </span>
              </div>
              <SupportThread messages={guestTicket.messages} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SupportPage() {
  return (
    <Suspense>
      <SupportContent />
    </Suspense>
  )
}
