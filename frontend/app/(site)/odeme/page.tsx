"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  Banknote,
  CreditCard,
  Gift,
  Landmark,
  Loader2,
  Tag,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth, useCart } from "@/components/providers"
import { api, type Address, type StoreSettings } from "@/lib/api"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

type PayMethod = "BANK_TRANSFER" | "COD" | "CARD"

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { items, giftCards, subtotal, clear } = useCart()

  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState({
    email: "",
    shippingName: "",
    shippingPhone: "",
    shippingCity: "",
    shippingDistrict: "",
    shippingAddress: "",
    shippingZip: "",
    note: "",
  })
  const [payMethod, setPayMethod] = useState<PayMethod>("BANK_TRANSFER")

  const [couponInput, setCouponInput] = useState("")
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [giftCardInput, setGiftCardInput] = useState("")
  const [giftCard, setGiftCard] = useState<{ code: string; balance: number } | null>(null)

  const hasProducts = items.length > 0
  const hasGiftCardsInCart = giftCards.length > 0

  useEffect(() => {
    if (items.length === 0 && giftCards.length === 0) router.replace("/sepet")
  }, [items.length, giftCards.length, router])

  useEffect(() => {
    api<StoreSettings>("/settings", { auth: false }).then(setSettings).catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) return
    setForm((f) => ({ ...f, email: user.email, shippingName: f.shippingName || user.name }))
    api<Address[]>("/users/addresses")
      .then(setAddresses)
      .catch(() => {})
  }, [user])

  const productSubtotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items],
  )

  const discount = coupon?.discount ?? 0
  const afterDiscount = subtotal - discount
  const shipping = useMemo(() => {
    if (!settings) return 0
    let fee = 0
    if (hasProducts) {
      fee = afterDiscount >= settings.freeShippingThreshold ? 0 : settings.shippingFee
    }
    if (payMethod === "COD") fee += settings.codFee
    return Math.round(fee * 100) / 100
  }, [settings, hasProducts, afterDiscount, payMethod])

  const payable = Math.max(0, afterDiscount + shipping)
  const giftCardUsage = giftCard ? Math.min(giftCard.balance, payable) : 0
  const grandTotal = Math.round((payable - giftCardUsage) * 100) / 100

  const applyCoupon = async () => {
    if (!couponInput.trim()) return
    try {
      const res = await api<{ code: string; discount: number }>("/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: couponInput.trim(), subtotal: productSubtotal }),
        auth: false,
      })
      setCoupon(res)
      toast.success(`Kupon uygulandı: -${formatPrice(res.discount)}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kupon geçersiz")
    }
  }

  const applyGiftCard = async () => {
    if (!giftCardInput.trim()) return
    if (hasGiftCardsInCart) {
      toast.error("Hediye kartı ile hediye kartı satın alınamaz.")
      return
    }
    try {
      const res = await api<{ code: string; balance: number }>("/gift-cards/check", {
        method: "POST",
        body: JSON.stringify({ code: giftCardInput.trim() }),
        auth: false,
      })
      setGiftCard(res)
      toast.success(`Hediye kartı bakiyesi: ${formatPrice(res.balance)}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hediye kartı geçersiz")
    }
  }

  const fillFromAddress = (a: Address) => {
    setForm((f) => ({
      ...f,
      shippingName: a.fullName,
      shippingPhone: a.phone,
      shippingCity: a.city,
      shippingDistrict: a.district,
      shippingAddress: a.address,
      shippingZip: a.zip ?? "",
    }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await api<{
        orderNo: string
        grandTotal: number
        paymentMethod: PayMethod
        bank: { bankName: string; ibanName: string; iban: string } | null
      }>("/orders", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          giftCardItems: giftCards.map((g) => ({
            amount: g.amount,
            recipientName: g.recipientName,
            recipientEmail: g.recipientEmail,
            message: g.message,
          })),
          couponCode: coupon?.code,
          giftCardCode: giftCard?.code,
          paymentMethod: payMethod,
        }),
      })
      sessionStorage.setItem(
        "miamiss_last_order",
        JSON.stringify({ ...res, email: form.email }),
      )
      clear()
      router.push("/siparis-basarili")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sipariş oluşturulamadı")
      setBusy(false)
    }
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent"

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <h1 className="font-display text-4xl">Ödeme</h1>

      <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          {/* İletişim */}
          <section className="rounded-md border border-border bg-card p-6">
            <h2 className="font-display text-2xl">İletişim</h2>
            {!user && (
              <p className="mt-1 text-xs text-muted-foreground">
                Zaten üye misiniz?{" "}
                <Link href="/giris" className="font-semibold text-accent hover:underline">
                  Giriş yapın
                </Link>{" "}
                — ya da misafir olarak devam edin.
              </p>
            )}
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold">E-posta *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={input}
                placeholder="ornek@eposta.com"
              />
            </div>
          </section>

          {/* Teslimat */}
          <section className="rounded-md border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Teslimat Adresi</h2>

            {addresses.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => fillFromAddress(a)}
                    className="rounded-full border border-border px-4 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent"
                  >
                    {a.title}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Ad Soyad *</label>
                <input
                  required
                  minLength={3}
                  value={form.shippingName}
                  onChange={(e) => setForm({ ...form, shippingName: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Telefon *</label>
                <input
                  required
                  type="tel"
                  minLength={10}
                  value={form.shippingPhone}
                  onChange={(e) => setForm({ ...form, shippingPhone: e.target.value })}
                  className={input}
                  placeholder="05xx xxx xx xx"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">İl *</label>
                <input
                  required
                  value={form.shippingCity}
                  onChange={(e) => setForm({ ...form, shippingCity: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">İlçe *</label>
                <input
                  required
                  value={form.shippingDistrict}
                  onChange={(e) => setForm({ ...form, shippingDistrict: e.target.value })}
                  className={input}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold">Açık Adres *</label>
                <textarea
                  required
                  minLength={10}
                  rows={3}
                  value={form.shippingAddress}
                  onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                  className={input}
                  placeholder="Mahalle, sokak, bina no, daire..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Posta Kodu</label>
                <input
                  value={form.shippingZip}
                  onChange={(e) => setForm({ ...form, shippingZip: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Sipariş Notu</label>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className={input}
                  placeholder="İsteğe bağlı"
                />
              </div>
            </div>
          </section>

          {/* Ödeme yöntemi */}
          <section className="rounded-md border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Ödeme Yöntemi</h2>
            <div className="mt-4 space-y-3">
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-4 rounded-md border p-4 transition-colors",
                  payMethod === "BANK_TRANSFER"
                    ? "border-accent bg-secondary/50"
                    : "border-border hover:border-accent/50",
                )}
              >
                <input
                  type="radio"
                  name="pay"
                  checked={payMethod === "BANK_TRANSFER"}
                  onChange={() => setPayMethod("BANK_TRANSFER")}
                  className="mt-1 accent-[oklch(0.63_0.065_75)]"
                />
                <Landmark className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm font-semibold">Havale / EFT</p>
                  <p className="text-xs text-muted-foreground">
                    Sipariş sonrası IBAN bilgileri gösterilir. Ödemeniz onaylanınca kargoya verilir.
                  </p>
                </div>
              </label>

              {hasProducts && (
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-4 rounded-md border p-4 transition-colors",
                    payMethod === "COD"
                      ? "border-accent bg-secondary/50"
                      : "border-border hover:border-accent/50",
                  )}
                >
                  <input
                    type="radio"
                    name="pay"
                    checked={payMethod === "COD"}
                    onChange={() => setPayMethod("COD")}
                    className="mt-1 accent-[oklch(0.63_0.065_75)]"
                  />
                  <Banknote className="mt-0.5 h-5 w-5 text-accent" />
                  <div>
                    <p className="text-sm font-semibold">Kapıda Ödeme</p>
                    <p className="text-xs text-muted-foreground">
                      Teslimatta nakit veya kartla ödeyin
                      {settings ? ` (+${formatPrice(settings.codFee)} hizmet bedeli)` : ""}.
                    </p>
                  </div>
                </label>
              )}

              <div className="flex items-start gap-4 rounded-md border border-dashed border-border p-4 opacity-60">
                <CreditCard className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-semibold">
                    Kredi Kartı{" "}
                    <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Çok Yakında
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Güvenli kart ödemesi kısa süre içinde aktif olacak.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Özet */}
        <div className="h-fit space-y-5 lg:sticky lg:top-28">
          <div className="rounded-md border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Özet</h2>

            <ul className="mt-4 space-y-2 border-b border-border pb-4 text-sm">
              {items.map((i) => (
                <li key={i.productId} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {i.name} <span className="text-xs">× {i.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium">{formatPrice(i.price * i.quantity)}</span>
                </li>
              ))}
              {giftCards.map((g) => (
                <li key={g.key} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Hediye Kartı</span>
                  <span className="shrink-0 font-medium">{formatPrice(g.amount)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ara toplam</dt>
                <dd className="font-medium">{formatPrice(subtotal)}</dd>
              </div>
              {coupon && (
                <div className="flex justify-between text-green-700">
                  <dt className="flex items-center gap-1">
                    Kupon ({coupon.code})
                    <button type="button" onClick={() => setCoupon(null)} aria-label="Kuponu kaldır">
                      <X className="h-3 w-3" />
                    </button>
                  </dt>
                  <dd>-{formatPrice(coupon.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Kargo</dt>
                <dd className="font-medium">
                  {shipping === 0 ? (
                    <span className="text-green-700">Ücretsiz</span>
                  ) : (
                    formatPrice(shipping)
                  )}
                </dd>
              </div>
              {giftCard && (
                <div className="flex justify-between text-green-700">
                  <dt className="flex items-center gap-1">
                    Hediye Kartı
                    <button type="button" onClick={() => setGiftCard(null)} aria-label="Hediye kartını kaldır">
                      <X className="h-3 w-3" />
                    </button>
                  </dt>
                  <dd>-{formatPrice(giftCardUsage)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <dt>Toplam</dt>
                <dd>{formatPrice(grandTotal)}</dd>
              </div>
            </dl>

            <button
              type="submit"
              disabled={busy}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Sipariş oluşturuluyor..." : "Siparişi Tamamla"}
            </button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
              Siparişi tamamlayarak{" "}
              <Link href="/mesafeli-satis" className="underline">
                Mesafeli Satış Sözleşmesi
              </Link>
              'ni kabul etmiş olursunuz.
            </p>
          </div>

          {/* Kupon */}
          <div className="rounded-md border border-border bg-card p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4 text-accent" /> Kupon Kodu
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="MIA-XXXXXX"
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm uppercase outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={applyCoupon}
                className="shrink-0 rounded-md border border-primary px-4 text-xs font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Uygula
              </button>
            </div>
          </div>

          {/* Hediye kartı */}
          {!hasGiftCardsInCart && (
            <div className="rounded-md border border-border bg-card p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Gift className="h-4 w-4 text-accent" /> Hediye Kartı ile Öde
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={giftCardInput}
                  onChange={(e) => setGiftCardInput(e.target.value.toUpperCase())}
                  placeholder="GIFT-XXXX-XXXX-XXXX"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm uppercase outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={applyGiftCard}
                  className="shrink-0 rounded-md border border-primary px-4 text-xs font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  Uygula
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
