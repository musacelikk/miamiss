"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Gift, Mail, Search, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useCart } from "@/components/providers"
import { Brand } from "@/components/brand"
import { api } from "@/lib/api"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

const PRESETS = [250, 500, 1000, 2000, 5000]

export default function GiftCardPage() {
  const { addGiftCard } = useCart()
  const [amount, setAmount] = useState<number>(500)
  const [custom, setCustom] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [message, setMessage] = useState("")

  const [checkCode, setCheckCode] = useState("")
  const [balance, setBalance] = useState<{ code: string; balance: number } | null>(null)

  const finalAmount = custom ? parseInt(custom, 10) || 0 : amount

  const addToCart = (e: React.FormEvent) => {
    e.preventDefault()
    if (finalAmount < 100 || finalAmount > 10000) {
      toast.error("Hediye kartı tutarı 100 – 10.000 TL arasında olmalıdır.")
      return
    }
    addGiftCard({
      amount: finalAmount,
      recipientName: recipientName || undefined,
      recipientEmail: recipientEmail || undefined,
      message: message || undefined,
    })
    toast.success(`${formatPrice(finalAmount)} tutarında hediye kartı sepete eklendi`)
  }

  const checkBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    setBalance(null)
    try {
      const res = await api<{ code: string; balance: number }>("/gift-cards/check", {
        method: "POST",
        body: JSON.stringify({ code: checkCode }),
        auth: false,
      })
      setBalance(res)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hediye kartı bulunamadı")
    }
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      {/* Başlık */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow mb-3 flex items-center justify-center gap-2">
          <Sparkles className="h-3.5 w-3.5" /> Hediye Kartı
        </p>
        <h1 className="font-display text-4xl sm:text-5xl">
          En Zarif Hediye: <span className="italic text-accent">Seçme Özgürlüğü</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Miamisu Home hediye kartıyla sevdikleriniz kendi zevkine göre seçsin.
          Ödemeniz onaylandığında hediye kartı kodu oluşturulur ve size iletilir;
          dilerseniz kişisel notunuzla birlikte alıcısına ulaştırırız.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_420px]">
        {/* Satın alma formu */}
        <form onSubmit={addToCart} className="rounded-lg border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-2xl">Hediye Kartı Oluştur</h2>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tutar Seçin
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => {
                  setAmount(p)
                  setCustom("")
                }}
                className={cn(
                  "rounded-md border px-5 py-2.5 text-sm font-semibold transition-colors",
                  !custom && amount === p
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border hover:border-accent hover:text-accent",
                )}
              >
                {formatPrice(p)}
              </button>
            ))}
            <input
              type="number"
              min={100}
              max={10000}
              placeholder="Özel tutar"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-32 rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Min 100 TL — Max 10.000 TL</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Alıcı Adı (isteğe bağlı)</label>
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className={input}
                placeholder="Hediye edilecek kişi"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold">
                Alıcı E-postası (isteğe bağlı)
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className={input}
                placeholder="ornek@eposta.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold">Notunuz (isteğe bağlı)</label>
              <textarea
                rows={3}
                maxLength={300}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={input}
                placeholder="İyi ki doğdun! ..."
              />
            </div>
          </div>

          <button className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent sm:w-auto sm:px-10">
            <Gift className="h-4 w-4" />
            Sepete Ekle — {formatPrice(finalAmount || 0)}
          </button>
        </form>

        {/* Sağ kolon: kart önizleme + bakiye sorgula */}
        <div className="space-y-6">
          {/* Kart önizlemesi */}
          <div className="relative aspect-[8/5] w-full overflow-hidden rounded-xl bg-primary p-7 text-primary-foreground shadow-xl">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/15" />
            <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-accent/10" />
            <p className="text-3xl text-accent">
              <Brand />
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-primary-foreground/60">
              Hediye Kartı
            </p>
            {recipientName && (
              <p className="mt-5 text-sm text-primary-foreground/80">
                Sevgili <strong>{recipientName}</strong>,
              </p>
            )}
            {message && (
              <p className="mt-1 line-clamp-2 max-w-[80%] text-xs italic text-primary-foreground/60">
                “{message}”
              </p>
            )}
            <p className="absolute bottom-7 left-7 font-mono text-sm tracking-[0.2em] text-primary-foreground/70">
              GIFT-••••-••••
            </p>
            <p className="absolute bottom-5 right-7 font-display text-3xl text-accent">
              {formatPrice(finalAmount || 0)}
            </p>
          </div>

          {/* Bakiye sorgulama */}
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Search className="h-4 w-4 text-accent" /> Bakiye Sorgula
            </p>
            <form onSubmit={checkBalance} className="mt-3 flex gap-2">
              <input
                value={checkCode}
                onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
                placeholder="GIFT-XXXX-XXXX-XXXX"
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm uppercase outline-none focus:border-accent"
              />
              <button className="shrink-0 rounded-md border border-primary px-4 text-xs font-semibold transition-colors hover:bg-primary hover:text-primary-foreground">
                Sorgula
              </button>
            </form>
            {balance && (
              <p className="mt-3 rounded-md bg-secondary/70 p-3 text-sm">
                <span className="font-mono font-semibold">{balance.code}</span> bakiyesi:{" "}
                <strong className="text-accent">{formatPrice(balance.balance)}</strong>
              </p>
            )}
          </div>

          {/* Nasıl çalışır */}
          <div className="rounded-lg border border-border bg-card p-6 text-sm">
            <p className="font-semibold">Nasıl çalışır?</p>
            <ol className="mt-3 space-y-2 text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-display text-accent">1.</span> Tutarı seçin, sepete ekleyin ve
                ödemeyi tamamlayın.
              </li>
              <li className="flex gap-2">
                <span className="font-display text-accent">2.</span> Ödemeniz onaylanınca kart kodu
                oluşturulur ve e-postanıza iletilir.
              </li>
              <li className="flex gap-2">
                <span className="font-display text-accent">3.</span> Kod, ödeme adımında “Hediye
                Kartı ile Öde” bölümüne girilir. Bakiye bitene kadar tekrar tekrar kullanılabilir.
              </li>
            </ol>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> Hediye kartları 1 yıl geçerlidir.
            </p>
          </div>

          <Link
            href="/sepet"
            className="flex items-center justify-center gap-1 text-sm font-semibold text-accent hover:underline"
          >
            Sepete git <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
