"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowRight,
  Check,
  Headset,
  ImagePlus,
  Loader2,
  Package,
  RotateCcw,
  Truck,
  X,
} from "lucide-react"
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
import { cn } from "@/lib/utils"

const STEPS: Order["status"][] = ["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"]

const RETURN_REASONS = [
  "Ürün hasarlı ulaştı",
  "Yanlış ürün geldi",
  "Beklediğim gibi değil",
  "Vazgeçtim",
  "Diğer",
]

const RETURN_STATUS_TR: Record<string, string> = {
  PENDING: "İnceleniyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  COMPLETED: "Tamamlandı",
}

interface ReturnInfo {
  id: string
  returnNo: string
  reason: string
  status: string
  adminNote: string | null
  createdAt: string
}

/* ---------- Zaman çizelgesi (tarih/saat tooltip'li) ---------- */

export function OrderStatusTimeline({
  status,
  history,
}: {
  status: Order["status"]
  history?: { status: string; at: string }[]
}) {
  const [openTip, setOpenTip] = useState<number | null>(null)

  const dateOf = (step: string) => {
    const entry = [...(history ?? [])].reverse().find((h) => h.status === step)
    return entry ? formatDateTime(entry.at) : null
  }

  if (status === "CANCELLED") {
    const at = dateOf("CANCELLED")
    return (
      <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
        <X className="h-4 w-4" /> Sipariş iptal edildi
        {at && <span className="ml-auto text-xs font-normal opacity-75">{at}</span>}
      </div>
    )
  }
  const activeIndex = STEPS.indexOf(status)

  return (
    <div className="flex items-center" onMouseLeave={() => setOpenTip(null)}>
      {STEPS.map((step, i) => {
        const at = dateOf(step)
        const reached = i <= activeIndex
        return (
          <div key={step} className={cn("flex items-center", i > 0 && "flex-1")}>
            {i > 0 && (
              <div className={cn("h-0.5 flex-1", reached ? "bg-accent" : "bg-border")} />
            )}
            <div className="relative flex flex-col items-center gap-1.5 px-1">
              {openTip === i && at && (
                <span className="absolute -top-9 z-10 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-[10px] font-medium text-background shadow-lg">
                  {at}
                  <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-foreground" />
                </span>
              )}
              <button
                type="button"
                onMouseEnter={() => at && setOpenTip(i)}
                onClick={() => at && setOpenTip(openTip === i ? null : i)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs transition-transform",
                  at && "cursor-pointer hover:scale-110",
                  i < activeIndex
                    ? "border-accent bg-accent text-accent-foreground"
                    : i === activeIndex
                      ? "border-accent bg-background text-accent"
                      : "border-border bg-background text-muted-foreground",
                )}
                aria-label={at ? `${ORDER_STATUS_TR[step]}: ${at}` : ORDER_STATUS_TR[step]}
              >
                {i < activeIndex ? (
                  <Check className="h-3.5 w-3.5" />
                ) : step === "SHIPPED" ? (
                  <Truck className="h-3.5 w-3.5" />
                ) : (
                  <Package className="h-3.5 w-3.5" />
                )}
              </button>
              <span
                className={cn(
                  "hidden text-[10px] font-medium sm:block",
                  reached ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {ORDER_STATUS_TR[step]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Modal kabuğu ---------- */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 pt-16 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl">{title}</h3>
          <button onClick={onClose} aria-label="Kapat" className="p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---------- Sipariş kartı ---------- */

export function OrderCard({
  order,
  cancelEmail,
  onCancelled,
}: {
  order: Order
  /** Verilirse iptal/iade islemleri aktiflesir (sahiplik kaniti) */
  cancelEmail?: string
  onCancelled?: () => void
}) {
  const [showCancel, setShowCancel] = useState(false)
  const [showReturn, setShowReturn] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [returns, setReturns] = useState<ReturnInfo[]>([])

  // İade formu
  const [reason, setReason] = useState(RETURN_REASONS[0])
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canCancel =
    !!cancelEmail &&
    !cancelled &&
    (order.status === "PENDING" || order.status === "CONFIRMED")
  const delivered = order.status === "DELIVERED"
  const activeReturn = returns.find((r) => r.status === "PENDING" || r.status === "APPROVED")

  useEffect(() => {
    if (!delivered || !cancelEmail) return
    api<ReturnInfo[]>(
      `/returns/track?orderNo=${order.orderNo}&email=${encodeURIComponent(cancelEmail)}`,
      { auth: false },
    )
      .then(setReturns)
      .catch(() => {})
  }, [delivered, cancelEmail, order.orderNo])

  const cancelOrder = async () => {
    if (!cancelEmail) return
    setCancelling(true)
    try {
      await api("/orders/cancel", {
        method: "POST",
        body: JSON.stringify({ orderNo: order.orderNo, email: cancelEmail }),
      })
      toast.success("Siparişiniz iptal edildi.")
      setCancelled(true)
      setShowCancel(false)
      onCancelled?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İptal edilemedi")
    } finally {
      setCancelling(false)
    }
  }

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return
    if (images.length + files.length > 5) {
      toast.error("En fazla 5 fotoğraf yükleyebilirsiniz.")
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f) => fd.append("files", f))
      const res = await api<{ urls: string[] }>("/uploads/returns", {
        method: "POST",
        body: fd,
        auth: false,
      })
      setImages((prev) => [...prev, ...res.urls])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fotoğraf yüklenemedi")
    } finally {
      setUploading(false)
    }
  }

  const submitReturn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cancelEmail) return
    setSubmitting(true)
    try {
      const res = await api<{ returnNo: string; status: string }>("/returns", {
        method: "POST",
        body: JSON.stringify({
          orderNo: order.orderNo,
          email: cancelEmail,
          reason,
          description,
          imageUrls: images,
        }),
      })
      toast.success(`İade talebiniz alındı — ${res.returnNo}`)
      setReturns((prev) => [
        {
          id: res.returnNo,
          returnNo: res.returnNo,
          reason,
          status: res.status,
          adminNote: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])
      setShowReturn(false)
      setDescription("")
      setImages([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Talep oluşturulamadı")
    } finally {
      setSubmitting(false)
    }
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  return (
    <div className="rounded-md border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="font-mono text-sm font-bold">{order.orderNo}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">{formatPrice(order.grandTotal)}</p>
          <p className="text-xs text-muted-foreground">
            {PAYMENT_METHOD_TR[order.paymentMethod]} · {PAYMENT_STATUS_TR[order.paymentStatus]}
          </p>
        </div>
      </div>

      <div className="py-5">
        <OrderStatusTimeline
          status={cancelled ? "CANCELLED" : order.status}
          history={order.statusHistory}
        />
      </div>

      {order.trackingNo && (
        <p className="mb-4 rounded-md bg-secondary/70 p-3 text-xs">
          <strong>Kargo:</strong> {order.cargoCompany ?? "—"} · Takip No:{" "}
          <span className="font-mono font-semibold">{order.trackingNo}</span>
        </p>
      )}

      {/* Kalemler — ürün hâlâ satıştaysa tıklanabilir */}
      <ul className="space-y-3">
        {order.items.map((item) => {
          const product = item.product
          const available = !!product?.slug && product.isActive !== false
          const categoryHref = item.categorySlug
            ? `/urunler?category=${item.categorySlug}`
            : "/urunler"

          const thumb = item.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl(item.imageUrl)}
              alt=""
              className="h-12 w-12 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
          )

          return (
            <li key={item.id} className="flex items-center gap-3 text-sm">
              {available ? (
                <Link href={`/urunler/${product!.slug}`} className="shrink-0">
                  {thumb}
                </Link>
              ) : (
                thumb
              )}
              <div className="min-w-0 flex-1">
                {available ? (
                  <Link
                    href={`/urunler/${product!.slug}`}
                    className="font-medium transition-colors hover:text-accent"
                  >
                    {item.name}
                    {item.variantName && (
                      <span className="ml-1.5 text-xs font-normal text-accent">
                        ({item.variantName})
                      </span>
                    )}
                  </Link>
                ) : (
                  <>
                    <p className="font-medium text-muted-foreground">
                      {item.name}
                      {item.variantName && (
                        <span className="ml-1.5 text-xs">({item.variantName})</span>
                      )}
                    </p>
                    {item.itemType === "PRODUCT" && (
                      <Link
                        href={categoryHref}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                      >
                        Bu ürün artık satışta değil — benzer ürünlere göz atın
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  {item.quantity} adet × {formatPrice(item.unitPrice)}
                </p>
                {item.boughtGiftCard?.code && item.boughtGiftCard.status !== "PENDING" && (
                  <p className="mt-0.5 font-mono text-xs font-semibold text-accent">
                    {item.boughtGiftCard.code}
                  </p>
                )}
              </div>
              <p className="shrink-0 font-semibold">
                {formatPrice(item.unitPrice * item.quantity)}
              </p>
            </li>
          )
        })}
      </ul>

      {/* İade talebi durumu */}
      {returns.length > 0 && (
        <div className="mt-4 space-y-2">
          {returns.map((r) => (
            <div
              key={r.id}
              className="rounded-md border border-accent/40 bg-secondary/50 p-3 text-xs"
            >
              <p className="font-semibold">
                İade Talebi <span className="font-mono">{r.returnNo}</span> —{" "}
                <span
                  className={cn(
                    r.status === "APPROVED" || r.status === "COMPLETED"
                      ? "text-green-700"
                      : r.status === "REJECTED"
                        ? "text-destructive"
                        : "text-accent",
                  )}
                >
                  {RETURN_STATUS_TR[r.status] ?? r.status}
                </span>
              </p>
              <p className="mt-0.5 text-muted-foreground">{r.reason}</p>
              {r.adminNote && (
                <p className="mt-1 rounded bg-background/70 p-2 text-muted-foreground">
                  {r.adminNote}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Aksiyon butonları */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/destek?siparis=${order.orderNo}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-2.5 text-xs font-semibold transition-colors hover:border-accent hover:text-accent sm:flex-none sm:px-5"
        >
          <Headset className="h-3.5 w-3.5" /> Canlı Destek
        </Link>

        {cancelled ? (
          <p className="flex flex-1 items-center justify-center rounded-md bg-destructive/10 py-2.5 text-xs font-semibold text-destructive sm:flex-none sm:px-5">
            Sipariş iptal edildi
          </p>
        ) : (
          canCancel && (
            <button
              onClick={() => setShowCancel(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-destructive/40 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground sm:flex-none sm:px-5"
            >
              Siparişi İptal Et
            </button>
          )
        )}

        {delivered && cancelEmail && !activeReturn && (
          <button
            onClick={() => setShowReturn(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-2.5 text-xs font-semibold transition-colors hover:border-accent hover:text-accent sm:flex-none sm:px-5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> İade Talebi Oluştur
          </button>
        )}
      </div>

      {/* İptal onay modalı */}
      {showCancel && (
        <Modal title="Siparişi İptal Et" onClose={() => setShowCancel(false)}>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            <strong className="font-mono text-foreground">{order.orderNo}</strong> numaralı
            siparişiniz iptal edilecek. Ödeme yaptıysanız tutar iade sürecine alınır; kupon
            hakkınız ve hediye kartı bakiyeniz geri yüklenir.
          </p>
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setShowCancel(false)}
              className="h-11 flex-1 rounded-md border border-border text-sm font-semibold"
            >
              Vazgeç
            </button>
            <button
              onClick={() => void cancelOrder()}
              disabled={cancelling}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-60"
            >
              {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
              Evet, İptal Et
            </button>
          </div>
        </Modal>
      )}

      {/* İade talebi modalı */}
      {showReturn && (
        <Modal title="İade Talebi Oluştur" onClose={() => setShowReturn(false)}>
          <form onSubmit={submitReturn} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold">İade Sebebi</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={input}
              >
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Açıklama *</label>
              <textarea
                required
                minLength={10}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={input}
                placeholder="İade sebebinizi kısaca anlatın (en az 10 karakter)..."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold">
                Fotoğraflar (isteğe bağlı, en fazla 5)
              </label>
              <div className="flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div key={url} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="h-16 w-16 rounded-md border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, j) => j !== i))}
                      className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
                      aria-label="Kaldır"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    <span className="text-[9px] font-medium">Ekle</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      onChange={(e) => void uploadImages(e.target.files)}
                    />
                  </label>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Hasar/yanlış ürün durumunda fotoğraf, sürecinizi hızlandırır.
              </p>
            </div>
            <button
              disabled={submitting || uploading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              İade Talebini Gönder
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
