"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Check, CheckCircle2, Copy, Landmark } from "lucide-react"
import { formatPrice } from "@/lib/format"

interface LastOrder {
  orderNo: string
  grandTotal: number
  paymentMethod: "BANK_TRANSFER" | "COD" | "CARD"
  email: string
  bank: { bankName: string; ibanName: string; iban: string } | null
}

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<LastOrder | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("miamiss_last_order")
      if (raw) setOrder(JSON.parse(raw))
    } catch {
      /* yoksayilir */
    }
  }, [])

  const copyIban = async () => {
    if (!order?.bank?.iban) return
    await navigator.clipboard.writeText(order.bank.iban)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:py-28">
      <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" strokeWidth={1.2} />
      <h1 className="mt-6 font-display text-4xl">Siparişiniz Alındı!</h1>

      {order ? (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            Sipariş numaranız:{" "}
            <strong className="font-mono text-base text-foreground">{order.orderNo}</strong>
            <br />
            Sipariş bilgileriniz <strong>{order.email}</strong> adresinize aittir — bu numarayla{" "}
            <Link href="/siparis-takip" className="text-accent underline">
              sipariş takibi
            </Link>{" "}
            yapabilirsiniz.
          </p>

          {order.paymentMethod === "BANK_TRANSFER" && (
            <div className="mt-8 rounded-md border border-accent/40 bg-secondary/50 p-6 text-left">
              <p className="flex items-center gap-2 font-display text-xl">
                <Landmark className="h-5 w-5 text-accent" /> Havale / EFT Bilgileri
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Toplam <strong className="text-foreground">{formatPrice(order.grandTotal)}</strong>{" "}
                tutarını aşağıdaki hesaba gönderin. Açıklama kısmına mutlaka sipariş numaranızı (
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
                      <dd className="flex items-center gap-2 font-mono font-semibold">
                        {order.bank.iban}
                        <button onClick={copyIban} aria-label="IBAN kopyala">
                          {copied ? (
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
        <p className="mt-3 text-sm text-muted-foreground">
          Sipariş bilgisi bulunamadı. Sipariş durumunuzu{" "}
          <Link href="/siparis-takip" className="text-accent underline">
            sipariş takip
          </Link>{" "}
          sayfasından kontrol edebilirsiniz.
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/urunler"
          className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
        >
          Alışverişe Devam Et
        </Link>
        <Link
          href="/siparis-takip"
          className="inline-flex h-11 items-center rounded-md border border-border px-6 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
        >
          Sipariş Takibi
        </Link>
      </div>
    </div>
  )
}
