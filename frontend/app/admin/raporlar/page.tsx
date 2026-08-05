"use client"

import { useEffect, useState } from "react"
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
import {
  exportExcel,
  exportPdf,
  type ExportColumn,
  type ExportRow,
} from "@/lib/export"

/** Dışa aktarılabilir rapor tanımları — kolonlar backend /admin/export/:type satırlarıyla eşleşir */
const EXPORT_REPORTS: Record<
  string,
  { label: string; dateFilter: boolean; columns: ExportColumn[] }
> = {
  orders: {
    label: "Siparişler",
    dateFilter: true,
    columns: [
      { key: "orderNo", label: "Sipariş No" },
      { key: "date", label: "Tarih" },
      { key: "customer", label: "Müşteri" },
      { key: "email", label: "E-posta" },
      { key: "city", label: "Şehir" },
      { key: "paymentMethod", label: "Ödeme" },
      { key: "paymentStatus", label: "Ödeme Durumu" },
      { key: "status", label: "Sipariş Durumu" },
      { key: "subtotal", label: "Ara Toplam", numeric: true },
      { key: "discount", label: "İndirim", numeric: true },
      { key: "shipping", label: "Kargo", numeric: true },
      { key: "grandTotal", label: "Genel Toplam", numeric: true },
      { key: "coupon", label: "Kupon" },
    ],
  },
  users: {
    label: "Üyeler",
    dateFilter: true,
    columns: [
      { key: "name", label: "Ad Soyad" },
      { key: "email", label: "E-posta" },
      { key: "phone", label: "Telefon" },
      { key: "registeredAt", label: "Kayıt Tarihi" },
      { key: "acceptsMarketing", label: "Pazarlama İzni" },
      { key: "via", label: "Kayıt Yöntemi" },
    ],
  },
  products: {
    label: "Ürünler",
    dateFilter: false,
    columns: [
      { key: "name", label: "Ürün" },
      { key: "sku", label: "Stok Kodu" },
      { key: "category", label: "Kategori" },
      { key: "price", label: "Fiyat", numeric: true },
      { key: "compareAtPrice", label: "İndirimsiz Fiyat", numeric: true },
      { key: "stock", label: "Stok", numeric: true },
      { key: "variants", label: "Seçenekler" },
      { key: "status", label: "Durum" },
      { key: "viewCount", label: "Görüntülenme", numeric: true },
    ],
  },
  stock: {
    label: "Stok Durumu",
    dateFilter: false,
    columns: [
      { key: "name", label: "Ürün" },
      { key: "sku", label: "Stok Kodu" },
      { key: "category", label: "Kategori" },
      { key: "stock", label: "Stok", numeric: true },
      { key: "variants", label: "Seçenek Stokları" },
      { key: "status", label: "Stok Durumu" },
      { key: "isActive", label: "Satış Durumu" },
    ],
  },
  favorites: {
    label: "En Çok Favorilenenler",
    dateFilter: false,
    columns: [
      { key: "rank", label: "Sıra", numeric: true },
      { key: "name", label: "Ürün" },
      { key: "sku", label: "Stok Kodu" },
      { key: "count", label: "Favori Sayısı", numeric: true },
      { key: "price", label: "Fiyat", numeric: true },
      { key: "stock", label: "Stok", numeric: true },
    ],
  },
  reviews: {
    label: "Yorumlar",
    dateFilter: true,
    columns: [
      { key: "product", label: "Ürün" },
      { key: "user", label: "Kullanıcı" },
      { key: "rating", label: "Puan", numeric: true },
      { key: "comment", label: "Yorum" },
      { key: "type", label: "Tür" },
      { key: "status", label: "Durum" },
      { key: "date", label: "Tarih" },
    ],
  },
  coupons: {
    label: "Kuponlar",
    dateFilter: true,
    columns: [
      { key: "code", label: "Kod" },
      { key: "type", label: "İndirim" },
      { key: "usedCount", label: "Kullanım", numeric: true },
      { key: "maxUses", label: "Limit", numeric: true },
      { key: "minOrderTotal", label: "Min. Sepet", numeric: true },
      { key: "expiresAt", label: "Son Geçerlilik" },
      { key: "source", label: "Kaynak" },
      { key: "status", label: "Durum" },
    ],
  },
  messages: {
    label: "İletişim Mesajları",
    dateFilter: true,
    columns: [
      { key: "name", label: "Ad" },
      { key: "email", label: "E-posta" },
      { key: "subject", label: "Konu" },
      { key: "message", label: "Mesaj" },
      { key: "status", label: "Durum" },
      { key: "date", label: "Tarih" },
    ],
  },
}

interface Reports {
  monthly: { month: string; orders: number; revenue: number }[]
  topFavorited: { name: string; slug: string; count: number; stock: number; price: number }[]
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
  const [exportType, setExportType] = useState<keyof typeof EXPORT_REPORTS>("orders")
  const [exportFrom, setExportFrom] = useState("")
  const [exportTo, setExportTo] = useState("")
  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    () => new Set(EXPORT_REPORTS.orders.columns.map((c) => c.key)),
  )
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null)

  useEffect(() => {
    api<Reports>("/admin/reports")
      .then(setData)
      .catch((e) => toast.error(e.message))
  }, [])

  const changeExportType = (type: keyof typeof EXPORT_REPORTS) => {
    setExportType(type)
    setSelectedCols(new Set(EXPORT_REPORTS[type].columns.map((c) => c.key)))
  }

  const toggleCol = (key: string) =>
    setSelectedCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const runExport = async (kind: "pdf" | "excel") => {
    const report = EXPORT_REPORTS[exportType]
    const columns = report.columns.filter((c) => selectedCols.has(c.key))
    if (!columns.length) {
      toast.error("En az bir kolon seçin")
      return
    }
    setExporting(kind)
    try {
      const params = new URLSearchParams()
      if (report.dateFilter && exportFrom) params.set("from", exportFrom)
      if (report.dateFilter && exportTo) params.set("to", exportTo)
      const qs = params.toString()
      const { rows } = await api<{ rows: ExportRow[] }>(
        `/admin/export/${exportType}${qs ? `?${qs}` : ""}`,
      )
      const dateStamp = new Date().toISOString().slice(0, 10)
      const subtitle =
        report.dateFilter && (exportFrom || exportTo)
          ? `${exportFrom || "başlangıç"} → ${exportTo || "bugün"}`
          : undefined
      const base = {
        title: `${report.label} Raporu`,
        subtitle,
        columns,
        rows,
        fileName: `miamisu-${exportType}-${dateStamp}.${kind === "pdf" ? "pdf" : "xlsx"}`,
      }
      if (kind === "pdf") await exportPdf(base)
      else await exportExcel(base)
      toast.success(`${rows.length} kayıt dışa aktarıldı`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dışa aktarma başarısız")
    } finally {
      setExporting(null)
    }
  }

  if (!data) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const exportReport = EXPORT_REPORTS[exportType]

  return (
    <div className="space-y-6">
      {/* PDF / Excel dışa aktarma */}
      <div className="rounded-md border border-dashed border-accent/40 bg-card p-5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          <h2 className="font-display text-xl">Rapor İndir (PDF / Excel)</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Rapor türünü, tarih aralığını ve kolonları seçip logolu PDF veya Excel olarak indir.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Rapor Türü</label>
            <select
              value={exportType}
              onChange={(e) => changeExportType(e.target.value as keyof typeof EXPORT_REPORTS)}
              className="rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            >
              {Object.entries(EXPORT_REPORTS).map(([key, r]) => (
                <option key={key} value={key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {exportReport.dateFilter && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Başlangıç</label>
                <input
                  type="date"
                  value={exportFrom}
                  onChange={(e) => setExportFrom(e.target.value)}
                  className="rounded-md border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Bitiş</label>
                <input
                  type="date"
                  value={exportTo}
                  onChange={(e) => setExportTo(e.target.value)}
                  className="rounded-md border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <p className="pb-2 text-[11px] text-muted-foreground">
                Boş bırakılırsa tüm kayıtlar dahil edilir.
              </p>
            </>
          )}
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold">Kolonlar</label>
          <div className="flex flex-wrap gap-1.5">
            {exportReport.columns.map((c) => {
              const on = selectedCols.has(c.key)
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCol(c.key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                    on
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-background text-muted-foreground hover:border-accent/60",
                  )}
                >
                  {on ? "✓ " : ""}
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => void runExport("pdf")}
            disabled={exporting !== null}
            className="flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
          >
            {exporting === "pdf" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            PDF İndir
          </button>
          <button
            onClick={() => void runExport("excel")}
            disabled={exporting !== null}
            className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-5 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-60"
          >
            {exporting === "excel" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Excel İndir
          </button>
        </div>
      </div>

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

        {/* En çok favorilenenler */}
        <div className="rounded-md border border-border bg-card">
          <h2 className="border-b border-border px-5 py-4 font-display text-xl">
            En Çok Favorilenen Ürünler
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2.5">Ürün</th>
                <th className="px-5 py-2.5 text-right">Favori</th>
                <th className="px-5 py-2.5 text-right">Stok</th>
                <th className="px-5 py-2.5 text-right">Fiyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data.topFavorited ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                    Henüz favorilenen ürün yok.
                  </td>
                </tr>
              )}
              {(data.topFavorited ?? []).map((p, i) => (
                <tr key={p.slug}>
                  <td className="px-5 py-2.5">
                    <span className="mr-2 font-display text-muted-foreground">{i + 1}.</span>
                    {p.name}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold">{p.count}</td>
                  <td className="px-5 py-2.5 text-right">{p.stock}</td>
                  <td className="px-5 py-2.5 text-right font-semibold">{formatPrice(p.price)}</td>
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
