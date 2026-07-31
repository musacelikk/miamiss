"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Heart,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Plus,
  Trash2,
  User as UserIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/providers"
import { api, type Address, type Order } from "@/lib/api"
import { OrderCard } from "@/components/site/order-card"
import { cn } from "@/lib/utils"
import { isValidPhone, phoneInputProps, sanitizeName, sanitizePhone, sanitizeZip } from "@/lib/input"

type Tab = "orders" | "addresses" | "profile"

const EMPTY_ADDRESS = {
  title: "",
  fullName: "",
  phone: "",
  city: "",
  district: "",
  address: "",
  zip: "",
  isDefault: false,
}

export default function AccountPage() {
  const router = useRouter()
  const { user, loading, logout, refresh } = useAuth()
  const [tab, setTab] = useState<Tab>("orders")

  const [orders, setOrders] = useState<Order[] | null>(null)
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [addressForm, setAddressForm] = useState<typeof EMPTY_ADDRESS & { id?: string }>(EMPTY_ADDRESS)
  const [showAddressForm, setShowAddressForm] = useState(false)

  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
  })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace("/giris")
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    setProfileForm((f) => ({ ...f, name: user.name, phone: user.phone ?? "" }))
    api<Order[]>("/orders/mine").then(setOrders).catch(() => setOrders([]))
    api<Address[]>("/users/addresses").then(setAddresses).catch(() => setAddresses([]))
  }, [user])

  if (loading || !user) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const reloadAddresses = () =>
    api<Address[]>("/users/addresses").then(setAddresses).catch(() => {})

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidPhone(addressForm.phone)) {
      toast.error("Geçerli bir telefon numarası girin (05xx xxx xx xx).")
      return
    }
    setBusy(true)
    try {
      const { id, ...data } = addressForm
      if (id) {
        await api(`/users/addresses/${id}`, { method: "PATCH", body: JSON.stringify(data) })
      } else {
        await api("/users/addresses", { method: "POST", body: JSON.stringify(data) })
      }
      toast.success("Adres kaydedildi")
      setShowAddressForm(false)
      setAddressForm(EMPTY_ADDRESS)
      await reloadAddresses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adres kaydedilemedi")
    } finally {
      setBusy(false)
    }
  }

  const deleteAddress = async (id: string) => {
    if (!confirm("Bu adresi silmek istediğinize emin misiniz?")) return
    try {
      await api(`/users/addresses/${id}`, { method: "DELETE" })
      await reloadAddresses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi")
    }
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
          ...(profileForm.newPassword
            ? {
                currentPassword: profileForm.currentPassword,
                newPassword: profileForm.newPassword,
              }
            : {}),
        }),
      })
      toast.success("Bilgileriniz güncellendi")
      setProfileForm((f) => ({ ...f, currentPassword: "", newPassword: "" }))
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi")
    } finally {
      setBusy(false)
    }
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Hesabım</p>
          <h1 className="font-display text-4xl">Merhaba, {user.name.split(" ")[0]}</h1>
        </div>
        <div className="flex gap-2">
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-accent"
            >
              Admin Panel
            </Link>
          )}
          <button
            onClick={() => {
              logout()
              router.push("/")
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-5 text-xs font-semibold transition-colors hover:border-destructive hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" /> Çıkış Yap
          </button>
        </div>
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto border-b border-border">
        {(
          [
            ["orders", "Siparişlerim", Package],
            ["addresses", "Adreslerim", MapPin],
            ["profile", "Bilgilerim", UserIcon],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 pb-3 text-sm font-medium transition-colors",
              tab === key
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
        <Link
          href="/begendiklerim"
          className="flex shrink-0 items-center gap-2 border-b-2 border-transparent px-4 pb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <Heart className="h-4 w-4" /> Beğendiklerim
        </Link>
      </div>

      <div className="mt-8">
        {/* Siparişler */}
        {tab === "orders" &&
          (orders === null ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
          ) : orders.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-2xl">Henüz siparişiniz yok</p>
              <Link
                href="/urunler"
                className="mt-4 inline-block text-sm font-semibold text-accent hover:underline"
              >
                Alışverişe başlayın →
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {orders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  cancelEmail={user.email}
                  onCancelled={() =>
                    api<Order[]>("/orders/mine").then(setOrders).catch(() => {})
                  }
                />
              ))}
            </div>
          ))}

        {/* Adresler */}
        {tab === "addresses" && (
          <div>
            {!showAddressForm && (
              <button
                onClick={() => {
                  setAddressForm({ ...EMPTY_ADDRESS, fullName: user.name })
                  setShowAddressForm(true)
                }}
                className="mb-6 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-accent"
              >
                <Plus className="h-4 w-4" /> Yeni Adres Ekle
              </button>
            )}

            {showAddressForm && (
              <form
                onSubmit={saveAddress}
                className="mb-6 rounded-md border border-border bg-card p-6"
              >
                <h3 className="font-display text-xl">
                  {addressForm.id ? "Adresi Düzenle" : "Yeni Adres"}
                </h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input
                    required
                    placeholder="Adres başlığı (Ev, İş...)"
                    value={addressForm.title}
                    onChange={(e) => setAddressForm({ ...addressForm, title: e.target.value })}
                    className={input}
                  />
                  <input
                    required
                    placeholder="Ad Soyad"
                    autoComplete="name"
                    value={addressForm.fullName}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, fullName: sanitizeName(e.target.value) })
                    }
                    className={input}
                  />
                  <input
                    required
                    {...phoneInputProps}
                    value={addressForm.phone}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, phone: sanitizePhone(e.target.value) })
                    }
                    className={input}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      required
                      placeholder="İl"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      className={input}
                    />
                    <input
                      required
                      placeholder="İlçe"
                      value={addressForm.district}
                      onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                      className={input}
                    />
                  </div>
                  <textarea
                    required
                    placeholder="Açık adres"
                    rows={2}
                    value={addressForm.address}
                    onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                    className={cn(input, "sm:col-span-2")}
                  />
                  <input
                    placeholder="Posta kodu (isteğe bağlı)"
                    inputMode="numeric"
                    maxLength={5}
                    value={addressForm.zip}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, zip: sanitizeZip(e.target.value) })
                    }
                    className={input}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, isDefault: e.target.checked })
                      }
                    />
                    Varsayılan adresim olsun
                  </label>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    disabled={busy}
                    className="h-10 rounded-md bg-primary px-6 text-xs font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="h-10 rounded-md border border-border px-6 text-xs font-semibold"
                  >
                    Vazgeç
                  </button>
                </div>
              </form>
            )}

            {addresses === null ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
            ) : addresses.length === 0 && !showAddressForm ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Kayıtlı adresiniz yok.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {addresses.map((a) => (
                  <div key={a.id} className="rounded-md border border-border bg-card p-5">
                    <div className="flex items-start justify-between">
                      <p className="font-semibold">
                        {a.title}{" "}
                        {a.isDefault && (
                          <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            Varsayılan
                          </span>
                        )}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setAddressForm({
                              id: a.id,
                              title: a.title,
                              fullName: a.fullName,
                              phone: a.phone,
                              city: a.city,
                              district: a.district,
                              address: a.address,
                              zip: a.zip ?? "",
                              isDefault: a.isDefault,
                            })
                            setShowAddressForm(true)
                            window.scrollTo({ top: 0, behavior: "smooth" })
                          }}
                          className="p-1 text-muted-foreground hover:text-accent"
                          aria-label="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void deleteAddress(a.id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                          aria-label="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
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
        )}

        {/* Profil */}
        {tab === "profile" && (
          <form onSubmit={saveProfile} className="max-w-lg rounded-md border border-border bg-card p-6">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold">E-posta</label>
                <input disabled value={user.email} className={cn(input, "opacity-60")} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Ad Soyad</label>
                <input
                  required
                  autoComplete="name"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: sanitizeName(e.target.value) })
                  }
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Telefon</label>
                <input
                  {...phoneInputProps}
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: sanitizePhone(e.target.value) })
                  }
                  className={input}
                />
              </div>
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-xs font-semibold text-muted-foreground">
                  Şifre değiştirmek istemiyorsanız boş bırakın
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="password"
                    placeholder="Mevcut şifre"
                    value={profileForm.currentPassword}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, currentPassword: e.target.value })
                    }
                    className={input}
                  />
                  <input
                    type="password"
                    placeholder="Yeni şifre (min 6)"
                    minLength={6}
                    value={profileForm.newPassword}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, newPassword: e.target.value })
                    }
                    className={input}
                  />
                </div>
              </div>
            </div>
            <button
              disabled={busy}
              className="mt-6 flex h-11 items-center gap-2 rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Kaydet
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
