"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, PackageSearch } from "lucide-react"
import { toast } from "sonner"
import { api, type Order } from "@/lib/api"
import { OrderCard } from "@/components/site/order-card"

function OrderTrackContent() {
  const params = useSearchParams()
  const [orderNo, setOrderNo] = useState(params.get("orderNo")?.toUpperCase() ?? "")
  const [email, setEmail] = useState(params.get("email") ?? "")
  const [busy, setBusy] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)

  const track = useCallback(async (no: string, mail: string) => {
    setBusy(true)
    setOrder(null)
    try {
      const res = await api<Order>(
        `/orders/track?orderNo=${encodeURIComponent(no)}&email=${encodeURIComponent(mail)}`,
        { auth: false },
      )
      setOrder(res)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sipariş bulunamadı")
    } finally {
      setBusy(false)
    }
  }, [])

  // Takip linkiyle gelindiyse otomatik sorgula
  useEffect(() => {
    const no = params.get("orderNo")
    const mail = params.get("email")
    if (no && mail) void track(no, mail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await track(orderNo, email)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:py-20">
      <div className="text-center">
        <PackageSearch className="mx-auto h-10 w-10 text-accent" strokeWidth={1.3} />
        <h1 className="mt-4 font-display text-4xl">Sipariş Takibi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sipariş numaranız ve e-posta adresinizle siparişinizin durumunu görüntüleyin.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 rounded-md border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Sipariş No</label>
            <input
              required
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value.toUpperCase())}
              placeholder="MIA-XXXXXXXX"
              className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 font-mono text-sm uppercase outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">E-posta</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@eposta.com"
              className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
        <button
          disabled={busy}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Sorgula
        </button>
      </form>

      {order && (
        <div className="mt-8">
          <OrderCard order={order} />
        </div>
      )}
    </div>
  )
}

export default function OrderTrackPage() {
  return (
    <Suspense>
      <OrderTrackContent />
    </Suspense>
  )
}
