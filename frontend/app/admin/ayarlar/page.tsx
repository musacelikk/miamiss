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
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  const set = (key: keyof StoreSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings({ ...settings, [key]: e.target.value })

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-2">
      <section className="rounded-md border border-border bg-card p-6">
        <h2 className="font-display text-xl">Kargo & Ödeme</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Buradaki tutarlar <strong className="text-foreground">müşteriden tahsil edilir</strong> —
          sepette ve ödeme adımında görünen ücretlerdir.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">
              Müşteriden Alınan Kargo Ücreti (TL)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.shippingFee}
              onChange={set("shippingFee")}
              className={input}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Ücretsiz Kargo Limiti (TL)</label>
            <input
              type="number"
              step="0.01"
              value={settings.freeShippingThreshold}
              onChange={set("freeShippingThreshold")}
              className={input}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Kapıda Ödeme Bedeli (TL)</label>
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

      <section className="rounded-md border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl">Desi Maliyet Tablosu</h2>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Bilgi amaçlı — müşteriye yansımaz
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Bu tablo yalnızca <strong className="text-foreground">senin kargo firmasına ödeyeceğin
          maliyeti tahmin etmek</strong> için kullanılır: ürün formunda ölçü/ağırlık girince desi
          hesaplanır ve tahmini maliyet burada yazdığın kademeden okunur. Müşterinin ödediği kargo
          ücreti soldaki "Kargo & Ödeme" kartından belirlenir; bu tabloyu değiştirmek sepetteki
          fiyatları etkilemez.
        </p>
        <div className="mt-4 space-y-2">
          {(settings.desiPrices ?? []).map((tier, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
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
                  className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <span className="text-xs text-muted-foreground">desi'ye kadar</span>
              </div>
              <div className="flex items-center gap-2">
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
                  className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <span className="text-xs text-muted-foreground">TL</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    desiPrices: settings.desiPrices.filter((_, j) => j !== i),
                  })
                }
                className="p-1.5 text-muted-foreground hover:text-destructive"
                aria-label="Satırı sil"
              >
                <Trash2 className="h-4 w-4" />
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
            className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:border-accent hover:text-accent"
          >
            <Plus className="h-3.5 w-3.5" /> Kademe Ekle
          </button>
        </div>
      </section>

      <section className="rounded-md border border-border bg-card p-6">
        <h2 className="font-display text-xl">Havale / EFT Bilgileri</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Bu bilgiler, havale ile ödeme seçen müşteriye sipariş sonrası gösterilir.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Banka Adı</label>
            <input value={settings.bankName} onChange={set("bankName")} className={input} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Hesap Sahibi</label>
            <input value={settings.ibanName} onChange={set("ibanName")} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">IBAN</label>
            <input
              value={settings.iban}
              onChange={set("iban")}
              className={`${input} font-mono`}
              placeholder="TR.."
            />
          </div>
        </div>
      </section>

      <section className="rounded-md border border-border bg-card p-6">
        <h2 className="font-display text-xl">İletişim & Site</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">E-posta</label>
            <input value={settings.contactEmail} onChange={set("contactEmail")} className={input} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Telefon</label>
            <input value={settings.contactPhone} onChange={set("contactPhone")} className={input} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">WhatsApp</label>
            <input value={settings.whatsapp} onChange={set("whatsapp")} className={input} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Instagram Kullanıcı Adı</label>
            <input value={settings.instagram} onChange={set("instagram")} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Adres</label>
            <input value={settings.address} onChange={set("address")} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">
              Duyuru Bandı (site üstündeki şerit — boş bırakılırsa gizlenir)
            </label>
            <input value={settings.announcement} onChange={set("announcement")} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">
              Duyuru Linki (tıklanınca gidilecek adres, örn: /urunler?category=vazolar)
            </label>
            <input
              value={settings.announcementUrl ?? ""}
              onChange={set("announcementUrl")}
              className={input}
              placeholder="Boş bırakılırsa tıklanamaz"
            />
          </div>
        </div>
      </section>
      </div>

      <button
        disabled={busy}
        className="flex h-11 items-center gap-2 rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Kaydet
      </button>
    </form>
  )
}
