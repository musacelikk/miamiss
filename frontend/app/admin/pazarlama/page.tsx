"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Eye,
  Loader2,
  Mail,
  MessageSquareText,
  Pencil,
  Plus,
  Send,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

interface Recipient {
  id: string
  name: string
  email: string
}

interface SubscriberData {
  members: {
    userId: string
    name: string
    email: string
    subscribed: boolean
    unsubscribedAt: string | null
    memberSince: string
  }[]
  external: { id: string; email: string; unsubscribedAt: string }[]
  counts: { subscribed: number; unsubscribed: number }
}

interface Template {
  id: string
  name: string
  type: "EMAIL" | "SMS"
  subject: string | null
  content: string
  lastSentAt: string | null
  sentCount: number
  updatedAt: string
}

/** Tek tikla baslangic noktasi olarak kullanilabilecek hazir HTML sablonlari */
const PRESETS: { name: string; subject: string; html: string }[] = [
  {
    name: "İndirim Kampanyası",
    subject: "Size özel %10 indirim başladı ✨",
    html: `<!doctype html>
<html lang="tr"><body style="margin:0;padding:0;background:#f7f4ee;font-family:Arial,sans-serif;color:#2e2925;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;padding-bottom:20px;">
    <img src="https://www.miamisuhome.com/logo/logo.png" alt="Miamisu Home" height="64" style="height:64px;width:auto;" />
  </div>
  <div style="background:#fff;border:1px solid #e6dfd2;border-radius:8px;padding:32px;text-align:center;">
    <p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#a5875c;margin:0;">Size Özel</p>
    <h1 style="font-family:Georgia,serif;font-size:30px;margin:12px 0;">Merhaba {{name}},<br/>%10 İndirim Sizi Bekliyor</h1>
    <p style="font-size:14px;color:#6b6258;line-height:1.6;">Doğal taş koleksiyonumuzda geçerli indirim fırsatını kaçırmayın. Sepette kupon kodunuzu kullanmanız yeterli.</p>
    <p style="margin:24px 0;"><span style="font-family:monospace;font-size:20px;letter-spacing:3px;border:2px dashed #a5875c;padding:10px 24px;border-radius:6px;color:#a5875c;">KUPONKODU</span></p>
    <a href="https://miamisuhome.com/urunler" style="display:inline-block;background:#2e2925;color:#fff;padding:14px 34px;border-radius:4px;text-decoration:none;font-size:14px;">Alışverişe Başla</a>
  </div>
  <p style="text-align:center;font-size:11px;color:#9b9184;margin-top:20px;">Miamisu Home · miamisuhome.com</p>
</div></body></html>`,
  },
  {
    name: "Yeni Ürün Duyurusu",
    subject: "Koleksiyona yeni parçalar eklendi 🏺",
    html: `<!doctype html>
<html lang="tr"><body style="margin:0;padding:0;background:#f7f4ee;font-family:Arial,sans-serif;color:#2e2925;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;padding-bottom:20px;">
    <img src="https://www.miamisuhome.com/logo/logo.png" alt="Miamisu Home" height="64" style="height:64px;width:auto;" />
  </div>
  <div style="background:#fff;border:1px solid #e6dfd2;border-radius:8px;padding:32px;">
    <p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#a5875c;margin:0;text-align:center;">Yeni Sezon</p>
    <h1 style="font-family:Georgia,serif;font-size:28px;margin:12px 0;text-align:center;">Merhaba {{name}}, Yeni Parçalar Geldi</h1>
    <p style="font-size:14px;color:#6b6258;line-height:1.6;text-align:center;">Traverten ve mermerden el işçiliğiyle üretilen yeni ürünlerimiz koleksiyondaki yerini aldı. İlk gören siz olun.</p>
    <p style="text-align:center;margin-top:24px;"><a href="https://miamisuhome.com/urunler" style="display:inline-block;background:#2e2925;color:#fff;padding:14px 34px;border-radius:4px;text-decoration:none;font-size:14px;">Koleksiyonu Keşfet</a></p>
  </div>
  <p style="text-align:center;font-size:11px;color:#9b9184;margin-top:20px;">Miamisu Home · miamisuhome.com</p>
</div></body></html>`,
  },
]

const SMS_PRESET =
  "Miamisu Home: Merhaba {{name}}! Dogal tas koleksiyonumuzda %10 indirim basladi. Kod: KUPONKODU miamisuhome.com"

const EMPTY = {
  name: "",
  type: "EMAIL" as "EMAIL" | "SMS",
  subject: "",
  content: "",
}

type FormState = typeof EMPTY & { id?: string }

export default function AdminMarketingPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)
  const [sendFor, setSendFor] = useState<Template | null>(null)
  const [audience, setAudience] = useState<"ALL" | "WITH_ORDERS">("ALL")
  const [testEmail, setTestEmail] = useState("")
  const [sending, setSending] = useState(false)
  // Gonderim paneli alici listesi
  const [recipients, setRecipients] = useState<Recipient[] | null>(null)
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [manualEmail, setManualEmail] = useState("")
  // Aboneler sekmesi
  const [tab, setTab] = useState<"templates" | "subscribers">("templates")
  const [subs, setSubs] = useState<SubscriberData | null>(null)
  const [blockEmail, setBlockEmail] = useState("")

  const addBlockedEmail = async () => {
    const email = blockEmail.trim().toLowerCase()
    if (!email) return
    try {
      await api("/admin/marketing/optouts", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      toast.success(`${email} artık kampanya almayacak`)
      setBlockEmail("")
      loadSubs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eklenemedi")
    }
  }

  const loadRecipients = useCallback((aud: "ALL" | "WITH_ORDERS") => {
    setRecipients(null)
    api<Recipient[]>(`/admin/marketing/recipients?audience=${aud}`)
      .then((list) => {
        setRecipients(list)
        setSelectedEmails(new Set(list.map((r) => r.email)))
      })
      .catch((e) => toast.error(e.message))
  }, [])

  const loadSubs = useCallback(() => {
    api<SubscriberData>("/admin/marketing/subscribers")
      .then(setSubs)
      .catch((e) => toast.error(e.message))
  }, [])

  useEffect(() => {
    if (tab === "subscribers") loadSubs()
  }, [tab, loadSubs])

  useEffect(() => {
    if (sendFor) loadRecipients(audience)
  }, [sendFor, audience, loadRecipients])

  const toggleEmail = (email: string, checked: boolean) =>
    setSelectedEmails((prev) => {
      const next = new Set(prev)
      if (checked) next.add(email)
      else next.delete(email)
      return next
    })

  const addManualEmail = () => {
    const email = manualEmail.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Geçerli bir e-posta adresi girin.")
      return
    }
    setRecipients((prev) =>
      prev?.some((r) => r.email === email)
        ? prev
        : [...(prev ?? []), { id: `manual-${email}`, name: "(elle eklendi)", email }],
    )
    setSelectedEmails((prev) => new Set(prev).add(email))
    setManualEmail("")
  }

  const toggleSubscriber = async (userId: string, subscribe: boolean) => {
    try {
      await api(`/admin/marketing/subscribers/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ acceptsMarketing: subscribe }),
      })
      toast.success(subscribe ? "Yeniden abone edildi" : "Listeden çıkarıldı")
      loadSubs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi")
    }
  }

  const load = useCallback(() => {
    api<Template[]>("/admin/marketing/templates")
      .then(setTemplates)
      .catch((e) => toast.error(e.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    if (form.type === "EMAIL" && !form.subject.trim()) {
      toast.error("E-posta şablonu için konu gereklidir.")
      return
    }
    setBusy(true)
    try {
      const payload = {
        name: form.name,
        type: form.type,
        subject: form.subject || undefined,
        content: form.content,
      }
      if (form.id) {
        await api(`/admin/marketing/templates/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      } else {
        await api("/admin/marketing/templates", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }
      toast.success("Şablon kaydedildi")
      setForm(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (t: Template) => {
    if (!confirm(`"${t.name}" şablonu silinsin mi?`)) return
    try {
      await api(`/admin/marketing/templates/${t.id}`, { method: "DELETE" })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi")
    }
  }

  const doSend = async (test: boolean) => {
    if (!sendFor) return
    if (test && !testEmail.trim()) {
      toast.error("Test için bir e-posta adresi girin.")
      return
    }
    if (!test && selectedEmails.size === 0) {
      toast.error("En az bir alıcı seçmelisiniz.")
      return
    }
    if (
      !test &&
      !confirm(`Kampanya seçili ${selectedEmails.size} kişiye gönderilecek. Emin misiniz?`)
    )
      return
    setSending(true)
    try {
      const res = await api<{ sent: number; skipped: number; test: boolean }>(
        "/admin/marketing/send",
        {
          method: "POST",
          body: JSON.stringify({
            templateId: sendFor.id,
            recipientEmails: test ? [] : [...selectedEmails],
            testEmail: test ? testEmail.trim() : undefined,
          }),
        },
      )
      toast.success(
        res.test
          ? "Test e-postası gönderildi"
          : `Kampanya ${res.sent} kişiye gönderildi${res.skipped ? ` (${res.skipped} kişi abonelikten çıktığı için atlandı)` : ""}`,
      )
      if (!res.test) setSendFor(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gönderilemedi")
    } finally {
      setSending(false)
    }
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(
            [
              ["templates", "Şablonlar"],
              ["subscribers", "Aboneler"],
            ] as const
          ).map(([key, labelText]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "rounded-full border px-5 py-2 text-xs font-semibold transition-colors",
                tab === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-accent",
              )}
            >
              {labelText}
            </button>
          ))}
        </div>
        {tab === "templates" && (
          <button
            onClick={() => setForm({ ...EMPTY })}
            className="flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> Yeni Şablon
          </button>
        )}
      </div>

      {tab === "subscribers" ? (
        subs === null ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm">
                <UserCheck className="h-4 w-4 text-green-600" />
                <strong>{subs.counts.subscribed}</strong> abone
              </span>
              <span className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm">
                <UserX className="h-4 w-4 text-destructive" />
                <strong>{subs.counts.unsubscribed}</strong> çıkmış
              </span>
              {/* Elle adres engelleme: yazilan adrese hicbir kampanya gitmez */}
              <div className="ml-auto flex gap-2">
                <input
                  type="email"
                  value={blockEmail}
                  onChange={(e) => setBlockEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void addBlockedEmail()
                    }
                  }}
                  placeholder="Adresi listeden çıkar..."
                  className="w-56 rounded-md border border-border bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                />
                <button
                  onClick={() => void addBlockedEmail()}
                  className="shrink-0 rounded-md border border-destructive/40 px-4 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  Engelle
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-border bg-card">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Üye</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subs.members.map((m) => (
                    <tr key={m.userId} className="hover:bg-secondary/40">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            m.subscribed
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800",
                          )}
                        >
                          {m.subscribed ? "Abone" : "Çıktı"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {m.subscribed
                          ? `Üyelik: ${formatDate(m.memberSince)}`
                          : m.unsubscribedAt
                            ? `Çıkış: ${formatDate(m.unsubscribedAt)}`
                            : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => void toggleSubscriber(m.userId, !m.subscribed)}
                          className={cn(
                            "rounded-md border px-3.5 py-1.5 text-[11px] font-semibold transition-colors",
                            m.subscribed
                              ? "border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              : "border-border hover:border-accent hover:text-accent",
                          )}
                        >
                          {m.subscribed ? "Listeden Çıkar" : "Yeniden Abone Et"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {subs.external.length > 0 && (
              <div className="rounded-md border border-border bg-card p-5">
                <h3 className="text-sm font-semibold">
                  Üye olmayan çıkışlar (elle eklenen adresler)
                </h3>
                <div className="mt-3 space-y-2">
                  {subs.external.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 text-xs"
                    >
                      <span>
                        {e.email}
                        <span className="ml-2 text-muted-foreground">
                          Çıkış: {formatDate(e.unsubscribedAt)}
                        </span>
                      </span>
                      <button
                        onClick={async () => {
                          try {
                            await api(`/admin/marketing/optouts/${e.id}`, {
                              method: "DELETE",
                            })
                            toast.success("Adres tekrar gönderilebilir")
                            loadSubs()
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Silinemedi")
                          }
                        }}
                        className="font-semibold text-accent hover:underline"
                      >
                        Çıkışı Kaldır
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <>
      <p className="text-sm text-muted-foreground">
        E-posta kampanyaları SMTP üzerinden gönderilir; SMS şablonları Netgsm bağlanınca
        aktifleşir. <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{"{{name}}"}</code>{" "}
        yazdığın yere alıcının adı gelir; her maile otomatik abonelikten çıkma linki eklenir.
      </p>

      {/* Şablon düzenleyici */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 pt-8">
          <form
            onSubmit={save}
            className="w-full max-w-5xl rounded-lg border border-border bg-background p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">
                {form.id ? "Şablonu Düzenle" : "Yeni Şablon"}
              </h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_140px]">
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Şablon Adı *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={input}
                  placeholder="Yaz kampanyası"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Tür</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as "EMAIL" | "SMS" })
                  }
                  className={input}
                >
                  <option value="EMAIL">E-posta</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>
            </div>

            {form.type === "EMAIL" && (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold">Konu *</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className={input}
                  placeholder="Size özel %10 indirim başladı ✨"
                />
              </div>
            )}

            {/* Hazır şablonlar */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Hazır şablondan başla:
              </span>
              {form.type === "EMAIL" ? (
                PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p.name}
                    onClick={() =>
                      setForm({
                        ...form,
                        subject: form.subject || p.subject,
                        content: p.html,
                      })
                    }
                    className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium hover:border-accent hover:text-accent"
                  >
                    {p.name}
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, content: SMS_PRESET })}
                  className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium hover:border-accent hover:text-accent"
                >
                  İndirim SMS'i
                </button>
              )}
            </div>

            <div className={cn("mt-4 grid gap-4", form.type === "EMAIL" && "lg:grid-cols-2")}>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  {form.type === "EMAIL" ? "HTML İçerik *" : "SMS Metni * (tek mesaj ≈ 160 karakter)"}
                </label>
                <textarea
                  required
                  rows={form.type === "EMAIL" ? 22 : 5}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className={cn(input, "font-mono text-xs leading-relaxed")}
                  placeholder={
                    form.type === "EMAIL"
                      ? "<html>... HTML şablonunuzu buraya yapıştırın ..."
                      : "Miamisu Home: Merhaba {{name}}! ..."
                  }
                />
                {form.type === "SMS" && (
                  <p className="mt-1 text-right text-[11px] text-muted-foreground">
                    {form.content.length} karakter
                  </p>
                )}
              </div>
              {form.type === "EMAIL" && (
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
                    <Eye className="h-3.5 w-3.5" /> Canlı Önizleme
                  </label>
                  <iframe
                    title="Şablon önizleme"
                    sandbox=""
                    srcDoc={form.content.replace(/\{\{\s*name\s*\}\}/g, "Ayşe")}
                    className="h-[460px] w-full rounded-md border border-border bg-white"
                  />
                </div>
              )}
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

      {/* Gönderim paneli */}
      {sendFor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 pt-16">
          <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Kampanya Gönder</h2>
              <button onClick={() => setSendFor(null)} aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Şablon: <strong className="text-foreground">{sendFor.name}</strong>
              {sendFor.subject && <> · Konu: {sendFor.subject}</>}
            </p>

            <div className="mt-5">
              <label className="mb-1.5 block text-xs font-semibold">Hedef Kitle</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as "ALL" | "WITH_ORDERS")}
                className={input}
              >
                <option value="ALL">Tüm üyeler (pazarlama izni olanlar)</option>
                <option value="WITH_ORDERS">Daha önce sipariş vermiş üyeler</option>
              </select>
            </div>

            {/* Alıcı listesi — çıkar / elle ekle */}
            <div className="mt-4 rounded-md border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="text-xs font-semibold">
                  Alıcılar{" "}
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                    {selectedEmails.size} seçili
                  </span>
                </p>
                {recipients && recipients.length > 0 && (
                  <button
                    onClick={() =>
                      setSelectedEmails(
                        selectedEmails.size === recipients.length
                          ? new Set()
                          : new Set(recipients.map((r) => r.email)),
                      )
                    }
                    className="text-[11px] font-semibold text-accent hover:underline"
                  >
                    {selectedEmails.size === recipients.length ? "Hiçbirini seçme" : "Tümünü seç"}
                  </button>
                )}
              </div>
              <div className="max-h-52 overflow-y-auto">
                {recipients === null ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  </div>
                ) : recipients.length === 0 ? (
                  <p className="px-3 py-5 text-center text-xs text-muted-foreground">
                    Bu kitlede izinli alıcı yok. Aşağıdan elle ekleyebilirsiniz.
                  </p>
                ) : (
                  recipients.map((r) => (
                    <label
                      key={r.email}
                      className="flex cursor-pointer items-center gap-2.5 border-b border-border/60 px-3 py-2 last:border-0 hover:bg-secondary/40"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(r.email)}
                        onChange={(e) => toggleEmail(r.email, e.target.checked)}
                        className="h-4 w-4 accent-[oklch(0.63_0.065_75)]"
                      />
                      <span className="min-w-0 flex-1 truncate text-xs">
                        <span className="font-medium">{r.name}</span>{" "}
                        <span className="text-muted-foreground">· {r.email}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
              <div className="flex gap-2 border-t border-border p-2">
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addManualEmail()
                    }
                  }}
                  placeholder="Listeye elle e-posta ekle..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs outline-none focus:border-accent"
                />
                <button
                  onClick={addManualEmail}
                  className="shrink-0 rounded-md border border-primary px-3 text-xs font-semibold hover:bg-primary hover:text-primary-foreground"
                >
                  Ekle
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-dashed border-border p-4">
              <label className="mb-1.5 block text-xs font-semibold">
                Önce kendine test gönder (önerilir)
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="senin@epostan.com"
                  className={input}
                />
                <button
                  onClick={() => void doSend(true)}
                  disabled={sending}
                  className="shrink-0 rounded-md border border-primary px-4 text-xs font-semibold hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  Test Et
                </button>
              </div>
            </div>

            <button
              onClick={() => void doSend(false)}
              disabled={sending}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {selectedEmails.size} Kişiye Gönder
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Her e-postanın altına otomatik "abonelikten çık" bağlantısı eklenir.
            </p>
          </div>
        </div>
      )}

      {/* Şablon listesi */}
      <div className="divide-y divide-border rounded-md border border-border bg-card">
        {templates === null ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
          </div>
        ) : templates.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Henüz şablon yok. "Yeni Şablon" ile başlayın — hazır tasarımlardan birini seçip
            düzenleyebilirsiniz.
          </p>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="flex items-center gap-4 px-5 py-4">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                  t.type === "EMAIL"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-violet-100 text-violet-700",
                )}
              >
                {t.type === "EMAIL" ? (
                  <Mail className="h-4 w-4" />
                ) : (
                  <MessageSquareText className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.type === "EMAIL" ? (t.subject ?? "Konu yok") : "SMS"}
                  {t.lastSentAt &&
                    ` · Son gönderim: ${formatDateTime(t.lastSentAt)} (${t.sentCount} kişi)`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => {
                    setSendFor(t)
                    setTestEmail("")
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold",
                    t.type === "EMAIL"
                      ? "bg-primary text-primary-foreground hover:bg-accent"
                      : "cursor-not-allowed bg-secondary text-muted-foreground",
                  )}
                  disabled={t.type === "SMS"}
                  title={t.type === "SMS" ? "Netgsm bağlanınca aktifleşir" : undefined}
                >
                  <Send className="h-3.5 w-3.5" />
                  {t.type === "SMS" ? "Yakında" : "Gönder"}
                </button>
                <button
                  onClick={() =>
                    setForm({
                      id: t.id,
                      name: t.name,
                      type: t.type,
                      subject: t.subject ?? "",
                      content: t.content,
                    })
                  }
                  className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-accent"
                  aria-label="Düzenle"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void remove(t)}
                  className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
        </>
      )}
    </div>
  )
}
