"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Check,
  CheckCircle2,
  Copy,
  Landmark,
  Link2,
  PackageSearch,
  Share2,
} from "lucide-react"
import { toast } from "sonner"
import { formatPrice } from "@/lib/format"

interface LastOrder {
  orderNo: string
  grandTotal: number
  paymentMethod: "BANK_TRANSFER" | "COD" | "CARD"
  email: string
  bank: { bankName: string; ibanName: string; iban: string } | null
}

function CopyButton({
  value,
  label,
  icon: Icon = Copy,
}: {
  value: string
  label: string
  icon?: typeof Copy
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        toast.success("Kopyalandı")
        setTimeout(() => setCopied(false), 2000)
      }}
      className="flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-xs font-semibold transition-colors hover:border-accent hover:text-accent"
    >
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  )
}

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<LastOrder | null>(null)
  const [ibanCopied, setIbanCopied] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("miamiss_last_order")
      if (raw) setOrder(JSON.parse(raw))
    } catch {
      /* yoksayilir */
    }
  }, [])

  const trackUrl =
    typeof window !== "undefined" && order
      ? `${window.location.origin}/siparis-takip?orderNo=${order.orderNo}&email=${encodeURIComponent(order.email)}`
      : ""

  const share = async () => {
    if (!order) return
    const text = `Miamisu Home siparişim: ${order.orderNo}\nTakip: ${trackUrl}`
    if (navigator.share) {
      try {
        await navigator.share({ title: "Siparişim", text, url: trackUrl })
      } catch {
        /* kullanici vazgecti */
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
    }
  }

  const copyIban = async () => {
    if (!order?.bank?.iban) return
    await navigator.clipboard.writeText(order.bank.iban)
    setIbanCopied(true)
    setTimeout(() => setIbanCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" strokeWidth={1.2} />
        <h1 className="mt-6 font-display text-4xl sm:text-5xl">Siparişiniz Başarılı! 🎉</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Teşekkürler — siparişinizi aldık ve hazırlamaya başlıyoruz.
        </p>
      </div>

      {order ? (
        <>
          {/* Sipariş takip kartı */}
          <div className="mt-8 rounded-lg border border-border bg-card p-6 text-center sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Sipariş Takip Kodunuz
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-wider text-accent sm:text-4xl">
              {order.orderNo}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Toplam: <strong className="text-foreground">{formatPrice(order.grandTotal)}</strong>
              {" · "}
              {order.email}
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <CopyButton value={order.orderNo} label="Kodu Kopyala" />
              <CopyButton value={trackUrl} label="Takip Linki" icon={Link2} />
              <button
                onClick={() => void share()}
                className="flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-xs font-semibold transition-colors hover:border-accent hover:text-accent"
              >
                <Share2 className="h-4 w-4" /> Paylaş
              </button>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              Bu kodu saklayın — sipariş durumunuzu istediğiniz zaman{" "}
              <Link href={trackUrl || "/siparis-takip"} className="text-accent underline">
                takip sayfasından
              </Link>{" "}
              sorgulayabilirsiniz.
            </p>
          </div>

          {order.paymentMethod === "BANK_TRANSFER" && (
            <div className="mt-6 rounded-md border border-accent/40 bg-secondary/50 p-6 text-left">
              <p className="flex items-center gap-2 font-display text-xl">
                <Landmark className="h-5 w-5 text-accent" /> Havale / EFT Bilgileri
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Toplam <strong className="text-foreground">{formatPrice(order.grandTotal)}</strong>{" "}
                tutarını aşağıdaki hesaba gönderin. Açıklama kısmına mutlaka sipariş kodunuzu (
                <strong className="font-mono">{order.orderNo}</strong>) yazın.
              </p>
              {order.bank && (order.bank.iban || order.bank.bankName) ? (
                <dl className="mt-4 space-y-2 text-sm">
                  {order.bank.bankName && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Banka</dt>
                      <dd className="font-semibold">{order.bank.bankName}</dd>
                    </div>
                  )}
                  {order.bank.ibanName && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Alıcı</dt>
                      <dd className="font-semibold">{order.bank.ibanName}</dd>
                    </div>
                  )}
                  {order.bank.iban && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">IBAN</dt>
                      <dd className="flex items-center gap-2 font-mono text-xs font-semibold sm:text-sm">
                        {order.bank.iban}
                        <button onClick={() => void copyIban()} aria-label="IBAN kopyala">
                          {ibanCopied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="mt-3 text-sm italic text-muted-foreground">
                  IBAN bilgileri e-posta ile iletilecektir.
                </p>
              )}
            </div>
          )}

          {order.paymentMethod === "COD" && (
            <p className="mt-6 rounded-md bg-secondary/70 p-4 text-sm text-muted-foreground">
              Siparişiniz hazırlanıp kargoya verilecek. Teslimat sırasında kapıda nakit veya kartla
              ödeme yapabilirsiniz.
            </p>
          )}
        </>
      ) : (
        <div className="mt-8 rounded-md border border-dashed border-border p-8 text-center">
          <PackageSearch className="mx-auto h-10 w-10 text-muted-foreground/50" strokeWidth={1.3} />
          <p className="mt-4 text-sm text-muted-foreground">
            Sipariş bilgisi bulunamadı. Sipariş kodunuz e-postanıza gönderildi;{" "}
            <Link href="/siparis-takip" className="text-accent underline">
              takip sayfasından
            </Link>{" "}
            sorgulayabilirsiniz.
          </p>
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/urunler"
          className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
        >
          Alışverişe Devam Et
        </Link>
        <Link
          href={trackUrl || "/siparis-takip"}
          className="inline-flex h-11 items-center rounded-md border border-border px-6 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
        >
          Siparişimi Takip Et
        </Link>
      </div>
    </div>
  )
}
