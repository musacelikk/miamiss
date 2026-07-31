"use client"

import { ORDER_STATUS_TR, type Order } from "@/lib/api"

const STATUS_COLORS: Record<Order["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-violet-100 text-violet-800",
  SHIPPED: "bg-cyan-100 text-cyan-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

export function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLORS[status]}`}
    >
      {ORDER_STATUS_TR[status]}
    </span>
  )
}
