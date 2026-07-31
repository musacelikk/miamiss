"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"
import {
  ArrowLeft,
  Banknote,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  ShoppingCart,
  Star,
} from "lucide-react"
import { toast } from "sonner"
import {
  api,
  imageUrl,
  PAYMENT_METHOD_TR,
  PAYMENT_STATUS_TR,
  type Address,
  type Order,
  type Product,
} from "@/lib/api"
import { formatDate, formatDateTime, formatPrice } from "@/lib/format"
import { StatusBadge } from "@/components/admin/status-badge"
import { cn } from "@/lib/utils"

interface MemberDetail {
  id: string
  name: string
  email: string
  phone: string | null
  role: "ADMIN" | "CUSTOMER"
  hasGoogle: boolean
  createdAt: string
  addresses: Address[]
  orders: Order[]
  favorites: Product[]
  reviews: {
    id: string
    rating: number
    comment: string
    isApproved: boolean
    createdAt: string
    productName: string | null
  }[]
  stats: { orderCount: number; totalSpent: number; lastOrderAt: string | null }
}

export default function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [member, setMember] = useState<MemberDetail | null>(null)

  useEffect(() => {
    api<MemberDetail>(`/admin/users/${id}`)
      .then(setMember)
      .catch((e) => toast.error(e.message))
  }, [id])

  if (!member) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/uyeler"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Üye listesine dön
      </Link>

      {/* Kimlik kartı */}
      <div className="rounded-md border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary font-display text-2xl">
              {member.name.charAt(0)}
            </span>
            <div>
              <p className="font-display text-2xl">
                {member.name}
                {member.role === "ADMIN" && (
                  <span className="ml-2 rounded-full bg-violet-100 px-2.5 py-1 align-middle text-[11px] font-semibold text-violet-800">
                    Admin
                  </span>
                )}
                {member.hasGoogle && (
                  <span className="ml-2 rounded-full bg-secondary px-2.5 py-1 align-middle text-[11px] font-semibold text-muted-foreground">
                    Google
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {member.email}
                {member.phone && (
                  <>
                    {" · "}
                    <Phone className="mb-0.5 inline h-3.5 w-3.5" /> {member.phone}
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Üyelik: {formatDate(member.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex gap-6 text-center">
            <div>
              <p className="font-display text-2xl">{member.stats.orderCount}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sipariş</p>
            </div>
            <div>
              <p className="font-display text-2xl">{formatPrice(member.stats.totalSpent)}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Toplam Harcama
              </p>
            </div>
            <div>
              <p className="font-display text-2xl">
                {member.stats.lastOrderAt ? formatDate(member.stats.lastOrderAt) : "—"}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Son Sipariş
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Sipariş geçmişi */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-xl">
            <ShoppingCart className="h-4 w-4 text-accent" /> Sipariş Geçmişi
          </h2>
          {member.orders.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Henüz siparişi yok.
            </p>
          ) : (
            member.orders.map((o) => (
              <div key={o.id} className="rounded-md border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <p className="font-mono text-sm font-bold">{o.orderNo}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {PAYMENT_METHOD_TR[o.paymentMethod]} · {PAYMENT_STATUS_TR[o.paymentStatus]}
                    </span>
                    <StatusBadge status={o.status} />
                    <span className="text-sm font-bold">{formatPrice(o.grandTotal)}</span>
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {o.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 text-sm">
                      {item.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={imageUrl(item.imageUrl)}
                          alt=""
                          className="h-9 w-9 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-secondary">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="flex-1 text-muted-foreground">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 rounded bg-secondary/50 p-2.5 text-xs text-muted-foreground">
                  <MapPin className="mb-0.5 mr-1 inline h-3 w-3" />
                  {o.shippingAddress} — {o.shippingDistrict} / {o.shippingCity}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Sağ kolon */}
        <div className="space-y-6">
          {/* Adresler */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl">
              <MapPin className="h-4 w-4 text-accent" /> Kayıtlı Adresler
            </h2>
            {member.addresses.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                Kayıtlı adres yok.
              </p>
            ) : (
              <div className="space-y-3">
                {member.addresses.map((a) => (
                  <div key={a.id} className="rounded-md border border-border bg-card p-4 text-sm">
                    <p className="font-semibold">
                      {a.title}
                      {a.isDefault && (
                        <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          Varsayılan
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {a.fullName} · {a.phone}
                      <br />
                      {a.address}
                      <br />
                      {a.district} / {a.city} {a.zip ?? ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Favoriler */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl">
              <Heart className="h-4 w-4 text-accent" /> Favorileri ({member.favorites.length})
            </h2>
            {member.favorites.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                Favorisi yok.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-md border border-border bg-card">
                {member.favorites.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl(p.images?.[0]?.url)}
                      alt=""
                      className="h-9 w-9 rounded object-cover"
                    />
                    <p className="flex-1 truncate text-sm">{p.name}</p>
                    <p className="text-xs font-semibold">{formatPrice(p.price)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Yorumları */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl">
              <MessageSquare className="h-4 w-4 text-accent" /> Yorumları ({member.reviews.length})
            </h2>
            {member.reviews.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                Yorumu yok.
              </p>
            ) : (
              <div className="space-y-3">
                {member.reviews.map((r) => (
                  <div key={r.id} className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">{r.productName ?? "Silinmiş ürün"}</p>
                      <span className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3 w-3",
                              i < r.rating ? "fill-accent text-accent" : "text-border",
                            )}
                          />
                        ))}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {r.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
