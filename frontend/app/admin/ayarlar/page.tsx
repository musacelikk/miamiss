"use client"

import { useEffect, useState } from "react"
import { BellRing, Globe, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api, type StoreSettings } from "@/lib/api"
import { parseDecimal } from "@/lib/format"
import { cn } from "@/lib/utils"

interface SeoSettings {
  siteTitle: string
  siteDescription: string
  keywords: string
  ogImage: string
  googleSiteVerification: string
  googleAnalyticsId: string
  googleAdsId: string
  metaPixelId: string
}

interface NotificationSettings {
  orderCreated: boolean
  returnRequested: boolean
  stockDepleted: boolean
  newUser: boolean
  reviewCreated: boolean
  contactMessage: boolean
  supportTicket: boolean
}

const NOTIFICATION_LABELS: { key: keyof NotificationSettings; label: string; desc: string }[] = [
  { key: "orderCreated", label: "Satış gerçekleştiğinde", desc: "Yeni sipariş geldiğinde sipariş özeti gönderilir" },
  { key: "returnRequested", label: "İade talebi oluştuğunda", desc: "Müşteri iade talebi açtığında bildirilir" },
  { key: "stockDepleted", label: "Stok tükendiğinde", desc: "Bir ürünün stoğu sıfırlandığında uyarı gönderilir" },
  { key: "newUser", label: "Yeni üye kaydında", desc: "Siteye yeni üye kaydolduğunda bildirilir" },
  { key: "reviewCreated", label: "Yorum yapıldığında", desc: "Ürünlere yeni yorum/yanıt geldiğinde bildirilir" },
  { key: "contactMessage", label: "İletişim mesajı geldiğinde", desc: "İletişim formundan mesaj geldiğinde bildirilir" },
  { key: "supportTicket", label: "Destek talebi geldiğinde", desc: "Yeni destek talebi veya müşteri yanıtında bildirilir" },
]

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null)
  const [seo, setSeo] = useState<SeoSettings | null>(null)
  const [seoBusy, setSeoBusy] = useState(false)

  useEffect(() => {
    api<StoreSettings>("/settings", { auth: false })
      .then(setSettings)
      .catch((e) => toast.error(e.message))
    api<NotificationSettings>("/admin/settings/notifications")
      .then(setNotifications)
      .catch(() => {})
    api<SeoSettings>("/settings/seo", { auth: false })
      .then(setSeo)
      .catch(() => {})
  }, [])

  const saveSeo = async () => {
    if (!seo) return
    setSeoBusy(true)
    try {
      const updated = await api<SeoSettings>("/admin/settings/seo", {
        method: "PUT",
        body: JSON.stringify(seo),
      })
      setSeo(updated)
      toast.success("SEO ayarları kaydedildi")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi")
    } finally {
      setSeoBusy(false)
    }
  }

  const setSeoField = (key: keyof SeoSettings) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setSeo((s) => (s ? { ...s, [key]: e.target.value } : s))

  /** Tek tik: aninda kaydedilir */
  const toggleNotification = async (key: keyof NotificationSettings) => {
    if (!notifications) return
    const next = { ...notifications, [key]: !notifications[key] }
    setNotifications(next)
    try {
      await api("/admin/settings/notifications", {
        method: "PUT",
        body: JSON.stringify({ [key]: next[key] }),
      })
      toast.success("Bildirim ayarı güncellendi")
    } catch (err) {
      setNotifications(notifications)
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi")
    }
  }

  if (!settings) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-accent" />
      </div>
    )
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const updated = await api<StoreSettings>("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...settings,
          shippingFee: parseDecimal(String(settings.shippingFee)) || 0,
          freeShippingThreshold: parseDecimal(String(settings.freeShippingThreshold)) || 0,
          codFee: parseDecimal(String(settings.codFee)) || 0,
          defaultDesi: parseInt(String(settings.defaultDesi), 10) || 1,
        }),
      })
      setSettings(updated)
      toast.success("Ayarlar kaydedildi")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi")
    } finally {
      setBusy(false)
    }
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
  const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
  const card = "rounded-md border border-border bg-card p-4 sm:p-5"
  const title = "font-display text-lg"

  const set = (key: keyof StoreSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings({ ...settings, [key]: e.target.value })

  return (
    <form onSubmit={save} className="space-y-4 pb-20">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* Sol kolon */}
        <div className="space-y-4">
          <section className={card}>
            <h2 className={title}>Kargo & Ödeme</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Müşteriden tahsil edilen tutarlar — sepette ve ödemede görünür.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className={label}>Kargo Ücreti (TL)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.shippingFee}
                  onChange={set("shippingFee")}
                  className={input}
                  placeholder="79,90"
                />
              </div>
              <div>
                <label className={label}>Ücretsiz Limiti (TL)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.freeShippingThreshold}
                  onChange={set("freeShippingThreshold")}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Kapıda Ödeme (TL)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.codFee}
                  onChange={set("codFee")}
                  className={input}
                />
              </div>
            </div>
          </section>

          <section className={card}>
            <h2 className={title}>Havale / EFT</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Havale seçen müşteriye sipariş sonrası gösterilir.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Banka Adı</label>
                <input value={settings.bankName} onChange={set("bankName")} className={input} />
              </div>
              <div>
                <label className={label}>Hesap Sahibi</label>
                <input value={settings.ibanName} onChange={set("ibanName")} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>IBAN</label>
                <input
                  value={settings.iban}
                  onChange={set("iban")}
                  className={`${input} font-mono`}
                  placeholder="TR.."
                />
              </div>
            </div>
          </section>

          <section className={card}>
            <h2 className={title}>Kargo Göndericisi (Geliver)</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Kargo gönderileri bu adresten çıkar. Geliver entegrasyonu için doldurun.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Gönderici Adı</label>
                <input value={settings.senderName} onChange={set("senderName")} className={input} />
              </div>
              <div>
                <label className={label}>Telefon</label>
                <input value={settings.senderPhone} onChange={set("senderPhone")} className={input} />
              </div>
              <div>
                <label className={label}>E-posta</label>
                <input value={settings.senderEmail} onChange={set("senderEmail")} className={input} />
              </div>
              <div>
                <label className={label}>İl</label>
                <input value={settings.senderCity} onChange={set("senderCity")} className={input} />
              </div>
              <div>
                <label className={label}>İlçe</label>
                <input
                  value={settings.senderDistrict}
                  onChange={set("senderDistrict")}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Posta Kodu</label>
                <input value={settings.senderZip} onChange={set("senderZip")} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Açık Adres</label>
                <input
                  value={settings.senderAddress}
                  onChange={set("senderAddress")}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Varsayılan Desi</label>
                <input
                  inputMode="numeric"
                  value={String(settings.defaultDesi)}
                  onChange={set("defaultDesi")}
                  className={input}
                />
              </div>
            </div>
          </section>

          <section className={card}>
            <h2 className={title}>İletişim & Site</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>E-posta</label>
                <input value={settings.contactEmail} onChange={set("contactEmail")} className={input} />
              </div>
              <div>
                <label className={label}>Telefon</label>
                <input value={settings.contactPhone} onChange={set("contactPhone")} className={input} />
              </div>
              <div>
                <label className={label}>WhatsApp</label>
                <input value={settings.whatsapp} onChange={set("whatsapp")} className={input} />
              </div>
              <div>
                <label className={label}>Instagram</label>
                <input value={settings.instagram} onChange={set("instagram")} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Adres</label>
                <input value={settings.address} onChange={set("address")} className={input} />
              </div>
            </div>
          </section>
        </div>

        {/* Sağ kolon */}
        <div className="space-y-4">
          <section className={card}>
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-accent" />
              <h2 className={title}>E-posta Bildirimleri</h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Açık olan olaylarda tüm admin kullanıcılara e-posta gönderilir. Tıklayınca anında
              kaydedilir.
            </p>
            <div className="mt-3 divide-y divide-border/60">
              {notifications === null ? (
                <div className="py-6 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" />
                </div>
              ) : (
                NOTIFICATION_LABELS.map(({ key, label: text, desc }) => (
                  <div key={key} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{text}</p>
                      <p className="text-[11px] text-muted-foreground">{desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifications[key]}
                      onClick={() => void toggleNotification(key)}
                      className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                        notifications[key] ? "bg-accent" : "bg-border",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                          notifications[key] ? "left-[22px]" : "left-0.5",
                        )}
                      />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={card}>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-accent" />
              <h2 className={title}>SEO & Google Ads</h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Arama motoru görünürlüğü ve reklam/analitik kodları. Kimlikler boş bırakılırsa
              ilgili script siteye eklenmez.
            </p>
            {seo === null ? (
              <div className="py-6 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" />
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={label}>Site Başlığı (Google&apos;da görünen)</label>
                  <input value={seo.siteTitle} onChange={setSeoField("siteTitle")} className={input} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Site Açıklaması (meta description)</label>
                  <textarea
                    rows={3}
                    value={seo.siteDescription}
                    onChange={setSeoField("siteDescription")}
                    className={input}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Anahtar Kelimeler (virgülle ayrılmış)</label>
                  <input value={seo.keywords} onChange={setSeoField("keywords")} className={input} />
                </div>
                <div>
                  <label className={label}>Google Analytics ID (G-XXXX)</label>
                  <input
                    value={seo.googleAnalyticsId}
                    onChange={setSeoField("googleAnalyticsId")}
                    className={`${input} font-mono`}
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className={label}>Google Ads ID (AW-XXXX)</label>
                  <input
                    value={seo.googleAdsId}
                    onChange={setSeoField("googleAdsId")}
                    className={`${input} font-mono`}
                    placeholder="AW-XXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className={label}>Google Site Doğrulama Kodu</label>
                  <input
                    value={seo.googleSiteVerification}
                    onChange={setSeoField("googleSiteVerification")}
                    className={`${input} font-mono`}
                    placeholder="Search Console meta içeriği"
                  />
                </div>
                <div>
                  <label className={label}>Meta (Facebook) Pixel ID</label>
                  <input
                    value={seo.metaPixelId}
                    onChange={setSeoField("metaPixelId")}
                    className={`${input} font-mono`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => void saveSeo()}
                    disabled={seoBusy}
                    className="flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-xs font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
                  >
                    {seoBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    SEO Ayarlarını Kaydet
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className={card}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={title}>Desi Maliyet Tablosu</h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Bilgi — müşteriye yansımaz
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Kargo firmasına ödeyeceğin maliyeti tahmin etmek için. Müşteri kargo ücreti soldaki
              karttan belirlenir.
            </p>
            <div className="mt-3 space-y-2">
              {(settings.desiPrices ?? []).map((tier, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/50 px-2.5 py-2"
                >
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={tier.desi}
                    onChange={(e) => {
                      const desiPrices = [...settings.desiPrices]
                      desiPrices[i] = { ...tier, desi: parseFloat(e.target.value) || 0 }
                      setSettings({ ...settings, desiPrices })
                    }}
                    className="w-20 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <span className="text-[11px] text-muted-foreground">desi&apos;ye kadar</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tier.price}
                    onChange={(e) => {
                      const desiPrices = [...settings.desiPrices]
                      desiPrices[i] = { ...tier, price: parseFloat(e.target.value) || 0 }
                      setSettings({ ...settings, desiPrices })
                    }}
                    className="w-24 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <span className="text-[11px] text-muted-foreground">TL</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        desiPrices: settings.desiPrices.filter((_, j) => j !== i),
                      })
                    }
                    className="ml-auto p-1.5 text-muted-foreground hover:text-destructive"
                    aria-label="Satırı sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const last = settings.desiPrices?.[settings.desiPrices.length - 1]
                  setSettings({
                    ...settings,
                    desiPrices: [
                      ...(settings.desiPrices ?? []),
                      { desi: (last?.desi ?? 0) + 5, price: (last?.price ?? 50) + 50 },
                    ],
                  })
                }}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-accent hover:text-accent"
              >
                <Plus className="h-3.5 w-3.5" /> Kademe Ekle
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex justify-end">
        <button
          disabled={busy}
          className="flex h-11 items-center gap-2 rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-accent disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Kaydet
        </button>
      </div>
    </form>
  )
}
