"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { AlertTriangle, Loader2, MapPin, Package, Ticket, Truck, X } from "lucide-react"
import { toast } from "sonner"
import { api, type Order } from "@/lib/api"
import { formatPrice } from "@/lib/format"

interface Offer {
  id: string
  carrier: string
  service: string
  amount: number
  currency: string
  estimatedTime: string
}

const field =
  "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"

/** Kargo icin duzeltilebilen teslimat alanlari. */
function ShippingInfoForm({
  order,
  onSaved,
}: {
  order: Order
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    shippingName: order.shippingName ?? "",
    shippingPhone: order.shippingPhone ?? "",
    shippingCity: order.shippingCity ?? "",
    shippingDistrict: order.shippingDistrict ?? "",
    shippingAddress: order.shippingAddress ?? "",
    shippingZip: order.shippingZip ?? "",
    shippingDesi: order.shippingDesi != null ? String(order.shippingDesi) : "",
  })
  const [saving, setSaving] = useState(false)

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      const desi = parseFloat(form.shippingDesi.replace(",", "."))
      await api(`/admin/orders/${order.id}/shipping/info`, {
        method: "PATCH",
        body: JSON.stringify({
          shippingName: form.shippingName,
          shippingPhone: form.shippingPhone,
          shippingCity: form.shippingCity,
          shippingDistrict: form.shippingDistrict,
          shippingAddress: form.shippingAddress,
          shippingZip: form.shippingZip,
          ...(Number.isFinite(desi) && desi > 0 ? { shippingDesi: desi } : {}),
        }),
      })
      toast.success("Teslimat bilgileri güncellendi")
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2 rounded-md bg-muted/40 p-2.5">
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Alıcı adı</span>
          <input className={field} value={form.shippingName} onChange={set("shippingName")} />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Telefon</span>
          <input className={field} value={form.shippingPhone} onChange={set("shippingPhone")} />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">İl</span>
          <input
            className={field}
            value={form.shippingCity}
            onChange={set("shippingCity")}
            placeholder="İstanbul"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">İlçe</span>
          <input
            className={field}
            value={form.shippingDistrict}
            onChange={set("shippingDistrict")}
            placeholder="Kadıköy"
          />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-[11px] text-muted-foreground">Adres</span>
        <input className={field} value={form.shippingAddress} onChange={set("shippingAddress")} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Posta kodu</span>
          <input className={field} value={form.shippingZip} onChange={set("shippingZip")} />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Desi (boş = mağaza varsayılanı)</span>
          <input
            className={field}
            inputMode="decimal"
            value={form.shippingDesi}
            onChange={set("shippingDesi")}
            placeholder="2"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
      >
        {saving && <Loader2 className="h-3 w-3 animate-spin" />}
        Kaydet
      </button>
    </div>
  )
}

/** Siparis detayinda Geliver kargo yonetimi: teklif, olusturma, etiket, iptal. */
export function ShippingPanel({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [offers, setOffers] = useState<Offer[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    api<{ enabled: boolean }>("/admin/shipping/config")
      .then((c) => setEnabled(c.enabled))
      .catch(() => setEnabled(false))
  }, [])

  if (enabled === null) return null
  if (!enabled) {
    return (
      <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        Geliver entegrasyonu yapılandırılmamış (GELIVER_API_TOKEN). Takip numarasını
        aşağıdan elle girebilirsiniz.
      </p>
    )
  }

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(okMsg)
      setOffers(null)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız")
    } finally {
      setBusy(false)
    }
  }

  const loadOffers = async () => {
    setBusy(true)
    try {
      setOffers(await api<Offer[]>(`/admin/orders/${order.id}/shipping/offers`))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Teklifler alınamadı")
    } finally {
      setBusy(false)
    }
  }

  if (order.labelUrl || order.geliverShipmentId) {
    return (
      <div className="space-y-2 rounded-md border border-border p-3 text-xs">
        <p className="flex items-center gap-1.5 font-semibold">
          <Truck className="h-3.5 w-3.5 text-accent" /> Geliver gönderisi oluşturuldu
        </p>
        <p className="text-muted-foreground">
          {order.cargoCompany ?? "-"} · Takip: {order.trackingNo ?? "bekleniyor"}
        </p>
        <div className="flex gap-2 pt-1">
          {order.labelUrl && (
            <a
              href={order.labelUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-primary px-3 py-1.5 font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Etiketi Aç
            </a>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(
                () => api(`/admin/orders/${order.id}/shipping`, { method: "DELETE" }),
                "Gönderi iptal edildi",
              )
            }
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 font-semibold text-destructive transition-colors hover:border-destructive disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            İptal Et
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2.5 rounded-md border border-border p-3 text-xs">
      <p className="flex items-center gap-1.5 font-semibold">
        <Package className="h-3.5 w-3.5 text-accent" /> Geliver Kargo
      </p>

      {order.shippingError && (
        <p className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Otomatik gönderi oluşturulamadı: {order.shippingError}
          </span>
        </p>
      )}

      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        className="flex items-center gap-1.5 font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <MapPin className="h-3.5 w-3.5" />
        {editing ? "Düzenlemeyi kapat" : "Teslimat bilgilerini düzelt"}
      </button>

      {editing && (
        <ShippingInfoForm
          order={order}
          onSaved={() => {
            setEditing(false)
            setOffers(null)
            onChanged()
          }}
        />
      )}

      {offers === null ? (
        <button
          type="button"
          disabled={busy}
          onClick={loadOffers}
          className="flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 font-semibold transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          Teklifleri Getir
        </button>
      ) : offers.length === 0 ? (
        <p className="text-muted-foreground">Bu adres için teklif bulunamadı.</p>
      ) : (
        <ul className="space-y-1.5">
          {offers.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                <Ticket className="mr-1 inline h-3 w-3" />
                {o.carrier}
                {o.estimatedTime ? ` · ${o.estimatedTime}` : ""} — {formatPrice(o.amount)}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      api(`/admin/orders/${order.id}/shipping`, {
                        method: "POST",
                        body: JSON.stringify({ offerId: o.id }),
                      }),
                    "Gönderi oluşturuldu",
                  )
                }
                className="shrink-0 rounded-md border border-primary px-2.5 py-1 font-semibold transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              >
                Oluştur
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          run(
            () =>
              api(`/admin/orders/${order.id}/shipping`, {
                method: "POST",
                body: JSON.stringify({}),
              }),
            "En uygun taşıyıcıyla gönderi oluşturuldu",
          )
        }
        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-50"
      >
        {busy && <Loader2 className="h-3 w-3 animate-spin" />}
        En Uygun Fiyatla Oluştur
      </button>
    </div>
  )
}
