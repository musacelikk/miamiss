"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronDown, Download, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  api,
  imageUrl,
  ORDER_STATUS_TR,
  PAYMENT_METHOD_TR,
  PAYMENT_STATUS_TR,
  type Order,
} from "@/lib/api"
import { formatDateTime, formatPrice } from "@/lib/format"
import { StatusBadge } from "@/components/admin/status-badge"
import { cn } from "@/lib/utils"

const STATUSES = Object.keys(ORDER_STATUS_TR) as Order["status"][]
const PAY_STATUSES = Object.keys(PAYMENT_STATUS_TR) as Order["paymentStatus"][]

function OrderRow({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tracking, setTracking] = useState(order.trackingNo ?? "")
  const [cargo, setCargo] = useState(order.cargoCompany ?? "")

  const update = async (patch: Record<string, string>) => {
    setBusy(true)
    try {
      await api(`/admin/orders/${order.id}`, { method: "PATCH", body: JSON.stringify(patch) })
      toast.success("Sipariş güncellendi")
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <p className="font-mono text-sm font-bold">{order.orderNo}</p>
          <p className="text-xs text-muted-foreground">
            {order.shippingName} · {order.email} · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:block">
            {PAYMENT_METHOD_TR[order.paymentMethod]}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              order.paymentStatus === "PAID"
                ? "bg-green-100 text-green-800"
                : order.paymentStatus === "PENDING"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-secondary text-muted-foreground",
            )}
          >
            {PAYMENT_STATUS_TR[order.paymentStatus]}
          </span>
          <StatusBadge status={order.status} />
          <p className="w-24 text-right text-sm font-bold">{formatPrice(order.grandTotal)}</p>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-5">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Kalemler + adres */}
            <div>
              <ul className="space-y-2.5">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 text-sm">
                    {item.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={imageUrl(item.imageUrl)} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-secondary text-xs">
                        🎁
                      </div>
                    )}
                    <span className="flex-1">
                      {item.name}
                      {item.variantName && (
                        <span className="text-accent"> ({item.variantName})</span>
                      )}{" "}
                      <span className="text-muted-foreground">× {item.quantity}</span>
                      {item.boughtGiftCard?.code && (
                        <span className="ml-2 font-mono text-xs text-accent">
                          {item.boughtGiftCard.code}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Ara toplam</dt>
                  <dd>{formatPrice(order.subtotal)}</dd>
                </div>
                {order.discountTotal > 0 && (
                  <div className="flex justify-between text-green-700">
                    <dt>İndirim {order.couponCode ? `(${order.couponCode})` : ""}</dt>
                    <dd>-{formatPrice(order.discountTotal)}</dd>
                  </div>
                )}
                {order.giftCardTotal > 0 && (
                  <div className="flex justify-between text-green-700">
                    <dt>Hediye kartı</dt>
                    <dd>-{formatPrice(order.giftCardTotal)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt>Kargo</dt>
                  <dd>{formatPrice(order.shippingTotal)}</dd>
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground">
                  <dt>Toplam</dt>
                  <dd>{formatPrice(order.grandTotal)}</dd>
                </div>
              </dl>

              <div className="mt-4 rounded-md bg-secondary/50 p-3 text-xs leading-relaxed">
                <p className="font-semibold">Teslimat Adresi</p>
                <p className="mt-1 text-muted-foreground">
                  {order.shippingName} · {order.shippingPhone}
                  <br />
                  {order.shippingAddress}
                  <br />
                  {order.shippingDistrict} / {order.shippingCity} {order.shippingZip ?? ""}
                </p>
                {order.note && (
                  <p className="mt-2">
                    <span className="font-semibold">Not:</span>{" "}
                    <span className="text-muted-foreground">{order.note}</span>
                  </p>
                )}
              </div>

              {/* Fatura bilgileri */}
              <div className="mt-3 rounded-md bg-secondary/50 p-3 text-xs leading-relaxed">
                <p className="font-semibold">
                  Fatura ({order.invoiceType === "CORPORATE" ? "Kurumsal" : "Bireysel"})
                </p>
                <p className="mt-1 text-muted-foreground">
                  {order.invoiceType === "CORPORATE" ? (
                    <>
                      {order.invoiceCompanyName ?? "—"}
                      <br />
                      Vergi No: {order.invoiceTaxNo ?? "—"}
                      {order.invoiceTaxOffice && ` · ${order.invoiceTaxOffice} V.D.`}
                    </>
                  ) : (
                    <>TCKN: {order.invoiceTckn ?? "Belirtilmedi"}</>
                  )}
                  {order.invoiceAddress && (
                    <>
                      <br />
                      Fatura adresi: {order.invoiceAddress}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Yönetim */}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Sipariş Durumu</label>
                <select
                  disabled={busy}
                  value={order.status}
                  onChange={(e) => void update({ status: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ORDER_STATUS_TR[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Ödeme Durumu</label>
                <select
                  disabled={busy}
                  value={order.paymentStatus}
                  onChange={(e) => void update({ paymentStatus: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                >
                  {PAY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PAYMENT_STATUS_TR[s]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  "Ödendi" seçilince satın alınan hediye kartları aktifleşir.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Kargo Firması</label>
                <input
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Yurtiçi, Aras..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Takip No</label>
                <div className="flex gap-2">
                  <input
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                  />
                  <button
                    disabled={busy}
                    onClick={() => void update({ trackingNo: tracking, cargoCompany: cargo })}
                    className="shrink-0 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
              {order.status !== "CANCELLED" && (
                <button
                  disabled={busy}
                  onClick={() => {
                    if (confirm("Sipariş iptal edilsin mi? Stok ve kupon hakları iade edilir.")) {
                      void update({ status: "CANCELLED" })
                    }
                  }}
                  className="w-full rounded-md border border-destructive/40 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                >
                  Siparişi İptal Et
                </button>
              )}
              <button
                disabled={busy}
                onClick={async () => {
                  if (
                    !confirm(
                      `${order.orderNo} kalıcı olarak SİLİNECEK ve geri alınamaz.\nStok iadesi gerekiyorsa önce iptal edin. Emin misiniz?`,
                    )
                  )
                    return
                  try {
                    await api(`/admin/orders/${order.id}`, { method: "DELETE" })
                    toast.success("Sipariş silindi")
                    onChanged()
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Silinemedi")
                  }
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" /> Siparişi Kalıcı Olarak Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Tum sayfalari cekip Excel uyumlu (BOM'lu) CSV indirir. */
async function exportCsv(status: string) {
  const rows: Order[] = []
  let page = 1
  for (;;) {
    const q = new URLSearchParams()
    if (status) q.set("status", status)
    q.set("page", String(page))
    const res = await api<{ items: Order[]; pageCount: number }>(
      `/admin/orders?${q.toString()}`,
    )
    rows.push(...res.items)
    if (page >= res.pageCount) break
    page++
  }
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const header = [
    "Sipariş No", "Tarih", "Müşteri", "E-posta", "Telefon", "İl", "İlçe",
    "Durum", "Ödeme Yöntemi", "Ödeme Durumu", "Ürünler",
    "Ara Toplam", "İndirim", "Hediye Kartı", "Kargo", "Toplam",
    "Kupon", "Kargo Firması", "Takip No",
  ]
  const lines = rows.map((o) =>
    [
      o.orderNo,
      formatDateTime(o.createdAt),
      o.shippingName,
      o.email,
      o.shippingPhone,
      o.shippingCity,
      o.shippingDistrict,
      ORDER_STATUS_TR[o.status],
      PAYMENT_METHOD_TR[o.paymentMethod],
      PAYMENT_STATUS_TR[o.paymentStatus],
      o.items.map((i) => `${i.name} x${i.quantity}`).join(" | "),
      o.subtotal, o.discountTotal, o.giftCardTotal, o.shippingTotal, o.grandTotal,
      o.couponCode ?? "",
      o.cargoCompany ?? "",
      o.trackingNo ?? "",
    ]
      .map(esc)
      .join(";"),
  )
  const csv = "﻿" + [header.map(esc).join(";"), ...lines].join("\r\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `miamiss-siparisler-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function AdminOrdersContent() {
  const params = useSearchParams()
  const [status, setStatus] = useState<string>(params.get("status") ?? "")
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(() => {
    const q = status ? `?status=${status}` : ""
    api<{ items: Order[] }>(`/admin/orders${q}`)
      .then((res) => setOrders(res.items))
      .catch((e) => toast.error(e.message))
  }, [status])

  useEffect(() => {
    setOrders(null)
    load()
  }, [load])

  const doExport = async () => {
    setExporting(true)
    try {
      await exportCsv(status)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dışa aktarılamadı")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => void doExport()}
          disabled={exporting || !orders?.length}
          className="mr-2 flex h-8 items-center gap-2 rounded-md border border-border bg-card px-4 text-xs font-semibold transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          CSV İndir
        </button>
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
            {ORDER_STATUS_TR[s]}
          </button>
        ))}
      </div>

      {orders === null ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
        </div>
      ) : orders.length === 0 ? (
        <p className="py-24 text-center text-sm text-muted-foreground">Sipariş bulunamadı.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <AdminOrdersContent />
    </Suspense>
  )
}
