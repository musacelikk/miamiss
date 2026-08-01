"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  AlertTriangle,
  Banknote,
  Eye,
  Gift,
  Headset,
  Home,
  Loader2,
  MessageSquare,
  Package,
  Plus,
  RotateCcw,
  ShoppingCart,
  Tag,
  Users,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { api, imageUrl, type Order, type Product } from "@/lib/api"
import { formatDateTime, formatPrice } from "@/lib/format"
import { StatusBadge } from "@/components/admin/status-badge"

interface Stats {
  totalOrders: number
  pendingOrders: number
  monthOrders: number
  totalProducts: number
  totalCustomers: number
  pendingReviews: number
  unreadMessages: number
  revenue: number
  monthRevenue: number
  lowStock: Product[]
  recentOrders: Order[]
  dailySeries: { date: string; orders: number; revenue: number }[]
  topViewed: Product[]
}

/* dataviz validasyonundan gecen renkler (tek serili iki ayri grafik) */
const REVENUE_COLOR = "#eb6834"
const ORDERS_COLOR = "#2a78d6"

const dayLabel = (d: string) => {
  const date = new Date(d)
  return `${date.getDate()}.${date.getMonth() + 1}`
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  formatter: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{label ? dayLabel(label) : ""}</p>
      <p className="text-muted-foreground">{formatter(payload[0].value)}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api<Stats>("/admin/stats").then(setStats).catch(() => {})
  }, [])

  if (!stats) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const cards = [
    {
      label: "Toplam Ciro (Ödenen)",
      value: formatPrice(stats.revenue),
      sub: `Son 30 gün: ${formatPrice(stats.monthRevenue)}`,
      icon: Banknote,
    },
    {
      label: "Siparişler",
      value: String(stats.totalOrders),
      sub: `${stats.pendingOrders} onay bekliyor`,
      icon: ShoppingCart,
    },
    {
      label: "Ürünler",
      value: String(stats.totalProducts),
      sub: `${stats.lowStock.length} üründe stok azaldı`,
      icon: Package,
    },
    {
      label: "Müşteriler",
      value: String(stats.totalCustomers),
      sub: `${stats.pendingReviews} yorum onay bekliyor`,
      icon: Users,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Kartlar — mobilde 2'li kompakt, genis ekranda 4'lu */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-card p-3 sm:p-5">
            <div className="flex items-center justify-between gap-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
                {c.label}
              </p>
              <c.icon className="h-3.5 w-3.5 shrink-0 text-accent sm:h-4 sm:w-4" />
            </div>
            <p className="mt-1.5 truncate font-display text-xl sm:mt-3 sm:text-3xl">{c.value}</p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">
              {c.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Hızlı erişim */}
      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8 sm:gap-3">
        {[
          { href: "/admin/urunler", label: "Yeni Ürün", icon: Plus },
          { href: "/admin/siparisler", label: "Siparişler", icon: ShoppingCart },
          { href: "/admin/urunler", label: "Ürünler", icon: Package },
          { href: "/admin/destek", label: "Destek", icon: Headset },
          { href: "/admin/iadeler", label: "İadeler", icon: RotateCcw },
          { href: "/admin/kuponlar", label: "Kuponlar", icon: Tag },
          { href: "/admin/hediye-kartlari", label: "H. Kartları", icon: Gift },
          { href: "/admin/anasayfa", label: "Anasayfa", icon: Home },
        ].map((q, i) => (
          <Link
            key={i}
            href={q.href}
            className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card py-3 text-center transition-colors hover:border-accent hover:text-accent"
          >
            <q.icon className="h-4 w-4" strokeWidth={1.7} />
            <span className="text-[10px] font-semibold leading-none sm:text-[11px]">
              {q.label}
            </span>
          </Link>
        ))}
      </div>

      {(stats.unreadMessages > 0 || stats.pendingOrders > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats.pendingOrders > 0 && (
            <Link
              href="/admin/siparisler?status=PENDING"
              className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              <AlertTriangle className="h-4 w-4" />
              {stats.pendingOrders} sipariş onay bekliyor
            </Link>
          )}
          {stats.unreadMessages > 0 && (
            <Link
              href="/admin/mesajlar"
              className="flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800 hover:bg-blue-100"
            >
              <MessageSquare className="h-4 w-4" />
              {stats.unreadMessages} okunmamış mesaj
            </Link>
          )}
        </div>
      )}

      {/* Satış grafikleri — son 30 gün (tek eksenli iki ayrı panel) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Günlük Ciro — Son 30 Gün (Ödenen)
          </h2>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailySeries} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.93 0.01 84)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={dayLabel}
                  tick={{ fontSize: 10, fill: "oklch(0.5 0.02 70)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "oklch(0.5 0.02 70)" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}₺`}
                />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => formatPrice(v)} />}
                  cursor={{ stroke: "oklch(0.85 0.02 80)", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={REVENUE_COLOR}
                  strokeWidth={2}
                  fill={REVENUE_COLOR}
                  fillOpacity={0.12}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Günlük Sipariş Adedi — Son 30 Gün
          </h2>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailySeries} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.93 0.01 84)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={dayLabel}
                  tick={{ fontSize: 10, fill: "oklch(0.5 0.02 70)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "oklch(0.5 0.02 70)" }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => `${v} sipariş`} />}
                  cursor={{ fill: "oklch(0.95 0.01 84)" }}
                />
                <Bar
                  dataKey="orders"
                  fill={ORDERS_COLOR}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* En çok tıklananlar */}
      <div className="rounded-md border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Eye className="h-4 w-4 text-accent" />
          <h2 className="font-display text-xl">En Çok Tıklanan Ürünler</h2>
        </div>
        <div className="grid gap-1 p-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.topViewed.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-secondary/40">
              <span className="w-5 text-center font-display text-lg text-muted-foreground">
                {i + 1}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(p.images?.[0]?.url)}
                alt=""
                className="h-10 w-10 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.viewCount ?? 0} görüntülenme
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Son siparişler */}
        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-xl">Son Siparişler</h2>
            <Link href="/admin/siparisler" className="text-xs font-semibold text-accent hover:underline">
              Tümü →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.recentOrders.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Henüz sipariş yok.</p>
            )}
            {stats.recentOrders.map((o) => (
              <Link
                key={o.id}
                href="/admin/siparisler"
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/40"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">{o.orderNo}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.shippingName} · {formatDateTime(o.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={o.status} />
                  <p className="w-24 text-right text-sm font-bold">{formatPrice(o.grandTotal)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Düşük stok */}
        <div className="h-fit rounded-md border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-xl">Kritik Stok</h2>
          </div>
          <div className="divide-y divide-border">
            {stats.lowStock.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Tüm stoklar yeterli 👍
              </p>
            )}
            {stats.lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm font-medium">{p.name}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    p.stock === 0 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {p.stock} adet
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
