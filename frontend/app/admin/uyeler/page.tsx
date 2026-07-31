"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatDate, formatPrice } from "@/lib/format"
import { useAuth } from "@/components/providers"
import { cn } from "@/lib/utils"

interface Member {
  id: string
  name: string
  email: string
  phone: string | null
  role: "ADMIN" | "CUSTOMER"
  hasGoogle: boolean
  createdAt: string
  orderCount: number
  totalSpent: number
}

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "CUSTOMER" as "ADMIN" | "CUSTOMER",
}

type FormState = typeof EMPTY & { id?: string }

export default function AdminUsersPage() {
  const { user: me } = useAuth()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    const q = search ? `?search=${encodeURIComponent(search)}` : ""
    api<Member[]>(`/admin/users${q}`)
      .then(setMembers)
      .catch((e) => toast.error(e.message))
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setBusy(true)
    try {
      if (form.id) {
        await api(`/admin/users/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            role: form.role,
            ...(form.password ? { newPassword: form.password } : {}),
          }),
        })
        toast.success("Üye güncellendi")
      } else {
        await api("/admin/users", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone || undefined,
            password: form.password,
            role: form.role,
          }),
        })
        toast.success("Üye oluşturuldu")
      }
      setForm(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (m: Member) => {
    if (
      !confirm(
        `"${m.name}" (${m.email}) silinsin mi? Siparişleri anonimleşir, favorileri ve adresleri silinir.`,
      )
    )
      return
    try {
      await api(`/admin/users/${m.id}`, { method: "DELETE" })
      toast.success("Üye silindi")
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi")
    }
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, e-posta veya telefon ara..."
            className="w-72 rounded-md border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => setForm({ ...EMPTY })}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> Yeni Üye
        </button>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 pt-16">
          <form
            onSubmit={save}
            className="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{form.id ? "Üyeyi Düzenle" : "Yeni Üye"}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Ad Soyad *</label>
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">E-posta *</label>
                <input
                  required
                  type="email"
                  disabled={!!form.id}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={cn(input, form.id && "opacity-60")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Telefon</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as "ADMIN" | "CUSTOMER" })
                  }
                  disabled={form.id === me?.id}
                  className={input}
                >
                  <option value="CUSTOMER">Müşteri</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold">
                  {form.id ? "Yeni Şifre (boş bırakılırsa değişmez)" : "Şifre *"}
                </label>
                <input
                  type="password"
                  required={!form.id}
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={input}
                  placeholder="En az 6 karakter"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="h-10 rounded-md border border-border px-6 text-xs font-semibold"
              >
                Vazgeç
              </button>
              <button
                disabled={busy}
                className="flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-xs font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Üye</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Sipariş</th>
              <th className="px-4 py-3">Toplam Harcama</th>
              <th className="px-4 py-3">Kayıt</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  Üye bulunamadı.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/uyeler/${m.id}`} className="group block">
                    <p className="font-medium group-hover:text-accent">
                      {m.name}
                      {m.hasGoogle && (
                        <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          Google
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        m.role === "ADMIN"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {m.role === "ADMIN" ? "Admin" : "Müşteri"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{m.orderCount}</td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(m.totalSpent)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(m.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() =>
                          setForm({
                            id: m.id,
                            name: m.name,
                            email: m.email,
                            phone: m.phone ?? "",
                            password: "",
                            role: m.role,
                          })
                        }
                        className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-accent"
                        aria-label="Düzenle"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {m.id !== me?.id && (
                        <button
                          onClick={() => void remove(m)}
                          className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                          aria-label="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
