"use client"

import { useState } from "react"
import { Check, Loader2, Package, Truck, X } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import {
  imageUrl,
  ORDER_STATUS_TR,
  PAYMENT_METHOD_TR,
  PAYMENT_STATUS_TR,
  type Order,
} from "@/lib/api"
import { formatDateTime, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

const STEPS: Order["status"][] = ["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"]

export function OrderStatusTimeline({ status }: { status: Order["status"] }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
        <X className="h-4 w-4" /> Sipariş iptal edildi
      </div>
    )
  }
  const activeIndex = STEPS.indexOf(status)
  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => (
        <div key={step} className={cn("flex items-center", i > 0 && "flex-1")}>
          {i > 0 && (
            <div
              className={cn(
                "h-0.5 flex-1",
                i <= activeIndex ? "bg-accent" : "bg-border",
              )}
            />
          )}
          <div className="flex flex-col items-center gap-1.5 px-1">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs",
                i < activeIndex
                  ? "border-accent bg-accent text-accent-foreground"
                  : i === activeIndex
                    ? "border-accent bg-background text-accent"
                    : "border-border bg-background text-muted-foreground",
              )}
            >
              {i < activeIndex ? (
                <Check className="h-3.5 w-3.5" />
              ) : step === "SHIPPED" ? (
                <Truck className="h-3.5 w-3.5" />
              ) : (
                <Package className="h-3.5 w-3.5" />
              )}
            </div>
            <span
              className={cn(
                "hidden text-[10px] font-medium sm:block",
                i <= activeIndex ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {ORDER_STATUS_TR[step]}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function OrderCard({
  order,
  cancelEmail,
  onCancelled,
}: {
  order: Order
  /** Verilirse ve siparis henuz hazirlanmadiysa iptal butonu gosterilir */
  cancelEmail?: string
  onCancelled?: () => void
}) {
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const canCancel =
    !!cancelEmail &&
    !cancelled &&
    (order.status === "PENDING" || order.status === "CONFIRMED")

  const cancelOrder = async () => {
    if (!cancelEmail) return
    if (
      !confirm(
        `${order.orderNo} numaralı siparişiniz iptal edilecek. Emin misiniz?`,
      )
    )
      return
    setCancelling(true)
    try {
      await api("/orders/cancel", {
        method: "POST",
        body: JSON.stringify({ orderNo: order.orderNo, email: cancelEmail }),
      })
      toast.success("Siparişiniz iptal edildi.")
      setCancelled(true)
      onCancelled?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İptal edilemedi")
    } finally {
      setCancelling(false)
    }
  }

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
        <OrderStatusTimeline status={order.status} />
      </div>

      {order.trackingNo && (
        <p className="mb-4 rounded-md bg-secondary/70 p-3 text-xs">
          <strong>Kargo:</strong> {order.cargoCompany ?? "—"} · Takip No:{" "}
          <span className="font-mono font-semibold">{order.trackingNo}</span>
        </p>
      )}

      <ul className="space-y-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 text-sm">
            {item.imageUrl ? (
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
            )}
            <div className="flex-1">
              <p className="font-medium">
                {item.name}
                {item.variantName && (
                  <span className="ml-1.5 text-xs font-normal text-accent">
                    ({item.variantName})
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} adet × {formatPrice(item.unitPrice)}
              </p>
              {item.boughtGiftCard?.code && item.boughtGiftCard.status !== "PENDING" && (
                <p className="mt-0.5 font-mono text-xs font-semibold text-accent">
                  {item.boughtGiftCard.code}
                </p>
              )}
            </div>
            <p className="font-semibold">{formatPrice(item.unitPrice * item.quantity)}</p>
          </li>
        ))}
      </ul>

      {cancelled ? (
        <p className="mt-4 rounded-md bg-destructive/10 p-3 text-center text-xs font-semibold text-destructive">
          Sipariş iptal edildi
        </p>
      ) : (
        canCancel && (
          <button
            onClick={() => void cancelOrder()}
            disabled={cancelling}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-destructive/40 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
          >
            {cancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Siparişi İptal Et
          </button>
        )
      )}
    </div>
  )
}
