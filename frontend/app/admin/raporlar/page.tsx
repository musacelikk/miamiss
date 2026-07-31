"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
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
import { toast } from "sonner"
import { api, PAYMENT_METHOD_TR } from "@/lib/api"
import { formatPrice } from "@/lib/format"

interface Reports {
  monthly: { month: string; orders: number; revenue: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]
  categoryBreakdown: { category: string; quantity: number; revenue: number }[]
  paymentBreakdown: { method: string; count: number; revenue: number }[]
  couponUsage: { code: string; count: number; discount: number }[]
  newCustomers: { month: string; count: number }[]
}

/* dataviz validasyonundan gecen renkler (tek serili ayri paneller) */
const REVENUE_COLOR = "#eb6834"
const COUNT_COLOR = "#2a78d6"

const MONTHS_TR = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
]

const monthLabel = (m: string) => {
  const [year, month] = m.split("-")
  return `${MONTHS_TR[parseInt(month, 10) - 1]} ${year.slice(2)}`
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
      <p className="font-semibold">{label ? monthLabel(label) : ""}</p>
      <p className="text-muted-foreground">{formatter(payload[0].value)}</p>
    </div>
  )
}

const axisTick = { fontSize: 10, fill: "oklch(0.5 0.02 70)" }
const gridStroke = "oklch(0.93 0.01 84)"

export default function AdminReportsPage() {
  const [data, setData] = useState<Reports | null>(null)

  useEffect(() => {
    api<Reports>("/admin/reports")
      .then(setData)
      .catch((e) => toast.error(e.message))
  }, [])

  if (!data) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Aylık ciro + sipariş (tek eksenli ayrı paneller) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Aylık Ciro — Son 12 Ay (Ödenen)
          </h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  tick={axisTick}
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
            Aylık Sipariş Adedi — Son 12 Ay
          </h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => `${v} sipariş`} />}
                  cursor={{ fill: "oklch(0.95 0.01 84)" }}
                />
                <Bar dataKey="orders" fill={COUNT_COLOR} radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* En çok satanlar */}
        <div className="rounded-md border border-border bg-card">
          <h2 className="border-b border-border px-5 py-4 font-display text-xl">
            En Çok Satan Ürünler
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2.5">Ürün</th>
                <th className="px-5 py-2.5 text-right">Adet</th>
                <th className="px-5 py-2.5 text-right">Ciro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.topProducts.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">
                    Henüz ödenmiş satış yok.
                  </td>
                </tr>
              )}
              {data.topProducts.map((p, i) => (
                <tr key={p.name}>
                  <td className="px-5 py-2.5">
                    <span className="mr-2 font-display text-muted-foreground">{i + 1}.</span>
                    {p.name}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold">{p.quantity}</td>
                  <td className="px-5 py-2.5 text-right font-semibold">{formatPrice(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Kategori kırılımı */}
        <div className="rounded-md border border-border bg-card">
          <h2 className="border-b border-border px-5 py-4 font-display text-xl">
            Kategori Kırılımı (Ödenen)
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2.5">Kategori</th>
                <th className="px-5 py-2.5 text-right">Adet</th>
                <th className="px-5 py-2.5 text-right">Ciro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.categoryBreakdown.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">
                    Veri yok.
                  </td>
                </tr>
              )}
              {data.categoryBreakdown.map((c) => (
                <tr key={c.category}>
                  <td className="px-5 py-2.5">{c.category}</td>
                  <td className="px-5 py-2.5 text-right font-semibold">{c.quantity}</td>
                  <td className="px-5 py-2.5 text-right font-semibold">{formatPrice(c.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ödeme yöntemleri */}
        <div className="rounded-md border border-border bg-card">
          <h2 className="border-b border-border px-5 py-4 font-display text-xl">
            Ödeme Yöntemleri
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2.5">Yöntem</th>
                <th className="px-5 py-2.5 text-right">Sipariş</th>
                <th className="px-5 py-2.5 text-right">Ödenen Ciro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.paymentBreakdown.map((p) => (
                <tr key={p.method}>
                  <td className="px-5 py-2.5">
                    {PAYMENT_METHOD_TR[p.method as keyof typeof PAYMENT_METHOD_TR] ?? p.method}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold">{p.count}</td>
                  <td className="px-5 py-2.5 text-right font-semibold">{formatPrice(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Kupon kullanımı */}
        <div className="rounded-md border border-border bg-card">
          <h2 className="border-b border-border px-5 py-4 font-display text-xl">
            Kupon Kullanımları
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2.5">Kod</th>
                <th className="px-5 py-2.5 text-right">Kullanım</th>
                <th className="px-5 py-2.5 text-right">Toplam İndirim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.couponUsage.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">
                    Henüz kupon kullanılmadı.
                  </td>
                </tr>
              )}
              {data.couponUsage.map((c) => (
                <tr key={c.code}>
                  <td className="px-5 py-2.5 font-mono font-semibold">{c.code}</td>
                  <td className="px-5 py-2.5 text-right font-semibold">{c.count}</td>
                  <td className="px-5 py-2.5 text-right font-semibold">{formatPrice(c.discount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yeni üye grafiği */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Aylık Yeni Üye — Son 12 Ay
        </h2>
        <div className="mt-4 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.newCustomers} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={monthLabel}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <Tooltip
                content={<ChartTooltip formatter={(v) => `${v} yeni üye`} />}
                cursor={{ fill: "oklch(0.95 0.01 84)" }}
              />
              <Bar dataKey="count" fill={COUNT_COLOR} radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
