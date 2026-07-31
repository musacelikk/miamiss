"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import {
  api,
  estimateDesi,
  estimateShippingCost,
  imageUrl,
  type Category,
  type Product,
  type StoreSettings,
} from "@/lib/api"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

const EMPTY = {
  name: "",
  description: "",
  material: "",
  dimensions: "",
  care: "",
  color: "",
  origin: "",
  features: "",
  boxContents: "",
  widthCm: "",
  heightCm: "",
  depthCm: "",
  weightKg: "",
  shippingFee: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
  isActive: true,
  isFeatured: false,
  categoryId: "",
  imageUrls: [] as string[],
}

type FormState = typeof EMPTY & { id?: string }

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [newCategory, setNewCategory] = useState("")

  const load = useCallback(() => {
    const q = search ? `?search=${encodeURIComponent(search)}` : ""
    api<{ items: Product[] }>(`/admin/products${q}`)
      .then((res) => setProducts(res.items))
      .catch((e) => toast.error(e.message))
    api<Category[]>("/categories", { auth: false }).then(setCategories).catch(() => {})
    api<StoreSettings>("/settings", { auth: false }).then(setSettings).catch(() => {})
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const openEdit = (p: Product) =>
    setForm({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      material: p.material ?? "",
      dimensions: p.dimensions ?? "",
      care: p.care ?? "",
      color: p.color ?? "",
      origin: p.origin ?? "",
      features: p.features ?? "",
      boxContents: p.boxContents ?? "",
      widthCm: p.widthCm != null ? String(p.widthCm) : "",
      heightCm: p.heightCm != null ? String(p.heightCm) : "",
      depthCm: p.depthCm != null ? String(p.depthCm) : "",
      weightKg: p.weightKg != null ? String(p.weightKg) : "",
      shippingFee: p.shippingFee != null ? String(p.shippingFee) : "",
      price: String(p.price),
      compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : "",
      stock: String(p.stock),
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      categoryId: p.categoryId ?? "",
      imageUrls: [...(p.images ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => i.url),
    })

  const upload = async (files: FileList | null) => {
    if (!files?.length || !form) return
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f) => fd.append("files", f))
      const res = await api<{ urls: string[] }>("/admin/uploads", { method: "POST", body: fd })
      setForm((f) => (f ? { ...f, imageUrls: [...f.imageUrls, ...res.urls] } : f))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yükleme başarısız")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setBusy(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        material: form.material || undefined,
        dimensions: form.dimensions || undefined,
        care: form.care || undefined,
        color: form.color || undefined,
        origin: form.origin || undefined,
        features: form.features || undefined,
        boxContents: form.boxContents || undefined,
        widthCm: form.widthCm ? parseFloat(form.widthCm) : undefined,
        heightCm: form.heightCm ? parseFloat(form.heightCm) : undefined,
        depthCm: form.depthCm ? parseFloat(form.depthCm) : undefined,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        shippingFee: form.shippingFee ? parseFloat(form.shippingFee) : undefined,
        price: parseFloat(form.price),
        compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
        stock: parseInt(form.stock, 10) || 0,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        categoryId: form.categoryId || undefined,
        imageUrls: form.imageUrls,
      }
      if (form.id) {
        await api(`/admin/products/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        toast.success("Ürün güncellendi")
      } else {
        await api("/admin/products", { method: "POST", body: JSON.stringify(payload) })
        toast.success("Ürün eklendi")
      }
      setForm(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (p: Product) => {
    if (!confirm(`"${p.name}" ürününü silmek istediğinize emin misiniz?`)) return
    try {
      await api(`/admin/products/${p.id}`, { method: "DELETE" })
      toast.success("Ürün silindi")
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi")
    }
  }

  const addCategory = async () => {
    if (!newCategory.trim()) return
    try {
      await api("/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategory.trim() }),
      })
      setNewCategory("")
      load()
      toast.success("Kategori eklendi")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eklenemedi")
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
            placeholder="Ürün ara..."
            className="w-64 rounded-md border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => setForm({ ...EMPTY })}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> Yeni Ürün
        </button>
      </div>

      {/* Form modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 pt-10">
          <form
            onSubmit={save}
            className="w-full max-w-2xl rounded-lg border border-border bg-background p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{form.id ? "Ürünü Düzenle" : "Yeni Ürün"}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold">Ürün Adı *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={input}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold">Açıklama</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Fiyat (TL) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  İndirimsiz Fiyat (üstü çizili)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.compareAtPrice}
                  onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
                  className={input}
                  placeholder="Boş bırakılabilir"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Stok *</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Kategori</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className={input}
                >
                  <option value="">Kategorisiz</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Malzeme</label>
                <input
                  value={form.material}
                  onChange={(e) => setForm({ ...form, material: e.target.value })}
                  className={input}
                  placeholder="Doğal traverten"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Ölçüler (görünen metin)</label>
                <input
                  value={form.dimensions}
                  onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                  className={input}
                  placeholder="15 × 7 cm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Renk</label>
                <input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className={input}
                  placeholder="Krem / Bej"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Menşei</label>
                <input
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                  className={input}
                  placeholder="Türkiye"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold">
                  Öne Çıkan Özellikler (her satır bir madde)
                </label>
                <textarea
                  rows={3}
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  className={input}
                  placeholder={"Her parça tektir\nDoğal gözenekli doku\nEl işçiliği"}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold">Kutu İçeriği</label>
                <input
                  value={form.boxContents}
                  onChange={(e) => setForm({ ...form, boxContents: e.target.value })}
                  className={input}
                  placeholder="1 × mumluk, bakım kartı"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold">Bakım Talimatı</label>
                <textarea
                  rows={2}
                  value={form.care}
                  onChange={(e) => setForm({ ...form, care: e.target.value })}
                  className={input}
                />
              </div>

              {/* Kargo & desi */}
              <div className="rounded-md border border-dashed border-accent/40 bg-secondary/30 p-4 sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Kargo Hesabı (desi)
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      ["widthCm", "En (cm)"],
                      ["heightCm", "Boy (cm)"],
                      ["depthCm", "Yükseklik (cm)"],
                      ["weightKg", "Ağırlık (kg)"],
                    ] as const
                  ).map(([key, lbl]) => (
                    <div key={key}>
                      <label className="mb-1.5 block text-xs font-semibold">{lbl}</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className={input}
                      />
                    </div>
                  ))}
                </div>
                {(() => {
                  const desi = estimateDesi({
                    widthCm: form.widthCm ? parseFloat(form.widthCm) : null,
                    heightCm: form.heightCm ? parseFloat(form.heightCm) : null,
                    depthCm: form.depthCm ? parseFloat(form.depthCm) : null,
                    weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
                  })
                  const cost = estimateShippingCost(desi, settings?.desiPrices ?? [])
                  return desi != null ? (
                    <p className="mt-3 text-sm">
                      Hesaplanan desi: <strong className="text-accent">{desi}</strong>
                      {cost != null && (
                        <>
                          {" "}
                          → Tahmini kargo maliyeti:{" "}
                          <strong className="text-accent">{formatPrice(cost)}</strong>
                          <span className="ml-1 text-xs text-muted-foreground">
                            (Ayarlar'daki desi tarifesine göre)
                          </span>
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Ölçü ve ağırlık girildiğinde desi ve tahmini kargo maliyeti burada hesaplanır.
                    </p>
                  )
                })()}
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs font-semibold">
                    Müşteriye Yansıyan Özel Kargo Ücreti (TL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.shippingFee}
                    onChange={(e) => setForm({ ...form, shippingFee: e.target.value })}
                    className={input}
                    placeholder="Boşsa mağaza geneli ücret uygulanır"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Sepette birden fazla ürün varsa en yüksek kargo ücreti geçerli olur; ücretsiz
                    kargo limiti yine uygulanır.
                  </p>
                </div>
              </div>

              {/* Görseller */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold">Görseller</label>
                <div className="flex flex-wrap gap-3">
                  {form.imageUrls.map((url, i) => (
                    <div key={`${url}-${i}`} className="group relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl(url)}
                        alt=""
                        className="h-20 w-20 rounded-md border border-border object-cover"
                      />
                      {i === 0 && (
                        <span className="absolute -left-1 -top-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground">
                          Kapak
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            imageUrls: form.imageUrls.filter((_, j) => j !== i),
                          })
                        }
                        className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
                        aria-label="Görseli kaldır"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="h-5 w-5" />
                        <span className="text-[10px] font-medium">Yükle</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => void upload(e.target.files)}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  İlk görsel kapak olur. JPEG/PNG/WebP, max 10 MB.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Satışta (aktif)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                />
                Öne çıkan (anasayfada göster)
              </label>
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
                disabled={busy || uploading}
                className="flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-xs font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tablo */}
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Ürün</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Fiyat</th>
              <th className="px-4 py-3">Stok</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products === null ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Ürün bulunamadı.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl(p.images?.[0]?.url)}
                        alt=""
                        className="h-11 w-11 rounded-md object-cover"
                      />
                      <div>
                        <p className="flex items-center gap-1.5 font-medium">
                          {p.name}
                          {p.isFeatured && <Star className="h-3 w-3 fill-accent text-accent" />}
                        </p>
                        <p className="text-xs text-muted-foreground">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-bold",
                        p.stock === 0
                          ? "bg-red-100 text-red-800"
                          : p.stock <= 3
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-800",
                      )}
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        p.isActive ? "bg-green-100 text-green-800" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {p.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-accent"
                        aria-label="Düzenle"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void remove(p)}
                        className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                        aria-label="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Kategori yönetimi */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-display text-xl">Kategoriler</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="group flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-medium"
            >
              {c.name}
              <button
                onClick={async () => {
                  if (!confirm(`"${c.name}" kategorisi silinsin mi? (Ürünler kategorisiz kalır)`)) return
                  try {
                    await api(`/admin/categories/${c.id}`, { method: "DELETE" })
                    load()
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Silinemedi")
                  }
                }}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Kategoriyi sil"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-2">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void addCategory())}
              placeholder="Yeni kategori"
              className="w-36 rounded-full border border-dashed border-border bg-background px-4 py-1.5 text-xs outline-none focus:border-accent"
            />
            <button
              onClick={() => void addCategory()}
              className="rounded-full bg-primary p-1.5 text-primary-foreground hover:bg-accent"
              aria-label="Kategori ekle"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
