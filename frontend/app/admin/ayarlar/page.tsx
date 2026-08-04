"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api, type StoreSettings } from "@/lib/api"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<StoreSettings>("/settings", { auth: false })
      .then(setSettings)
      .catch((e) => toast.error(e.message))
  }, [])

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
          shippingFee: Number(settings.shippingFee),
          freeShippingThreshold: Number(settings.freeShippingThreshold),
          codFee: Number(settings.codFee),
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
                  type="number"
                  step="0.01"
                  value={settings.shippingFee}
                  onChange={set("shippingFee")}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Ücretsiz Limiti (TL)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.freeShippingThreshold}
                  onChange={set("freeShippingThreshold")}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Kapıda Ödeme (TL)</label>
                <input
                  type="number"
                  step="0.01"
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
