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
import { ImagePicker } from "@/components/admin/image-picker"

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
  sku: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
  isActive: true,
  isFeatured: false,
  categoryId: "",
  imageUrls: [] as string[],
  variants: [] as {
    name: string
    price: string
    compareAtPrice: string
    stock: string
    sku: string
    image: string | null
  }[],
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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock" | "isActive" | "viewCount" | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const toggleSort = (key: NonNullable<typeof sortBy>) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(key)
      setSortDir("asc")
    }
  }

  const sortedProducts = products
    ? [...products].sort((a, b) => {
        if (!sortBy) return 0
        const dir = sortDir === "asc" ? 1 : -1
        if (sortBy === "name") return a.name.localeCompare(b.name, "tr") * dir
        if (sortBy === "isActive") return (Number(a.isActive) - Number(b.isActive)) * dir
        return ((a[sortBy] ?? 0) as number) > ((b[sortBy] ?? 0) as number)
          ? dir
          : ((a[sortBy] ?? 0) as number) < ((b[sortBy] ?? 0) as number)
            ? -dir
            : 0
      })
    : null

  const toggleSelect = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  /** Toplu aktif/pasif: mevcut alanlari koruyarak yalnizca isActive degistirir */
  const bulkSetActive = async (isActive: boolean) => {
    if (!products || !selected.size) return
    setBulkBusy(true)
    let ok = 0
    for (const p of products.filter((x) => selected.has(x.id))) {
      try {
        await api(`/admin/products/${p.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: p.name,
            price: p.price,
            stock: p.stock,
            compareAtPrice: p.compareAtPrice ?? undefined,
            shippingFee: p.shippingFee ?? undefined,
            isFeatured: p.isFeatured,
            categoryId: p.categoryId ?? undefined,
            isActive,
          }),
        })
        ok++
      } catch {
        /* devam */
      }
    }
    toast.success(`${ok} ürün ${isActive ? "satışa açıldı" : "satıştan kaldırıldı"}`)
    setSelected(new Set())
    setBulkBusy(false)
    load()
  }

  const bulkDelete = async () => {
    if (!selected.size) return
    if (!confirm(`${selected.size} ürün kalıcı olarak silinecek. Emin misiniz?`)) return
    setBulkBusy(true)
    let ok = 0
    for (const id of selected) {
      try {
        await api(`/admin/products/${id}`, { method: "DELETE" })
        ok++
      } catch {
        /* devam */
      }
    }
    toast.success(`${ok} ürün silindi`)
    setSelected(new Set())
    setBulkBusy(false)
    load()
  }

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
      sku: p.sku ?? "",
      price: String(p.price),
      compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : "",
      stock: String(p.stock),
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      categoryId: p.categoryId ?? "",
      imageUrls: [...(p.images ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => i.url),
      variants: [...(p.variants ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((v) => ({
          name: v.name,
          price: String(v.price),
          compareAtPrice: v.compareAtPrice != null ? String(v.compareAtPrice) : "",
          stock: String(v.stock),
          sku: v.sku ?? "",
          image: v.image ?? null,
        })),
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
        sku: form.sku.trim() || undefined,
        price: parseFloat(form.price),
        compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
        stock: parseInt(form.stock, 10) || 0,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        categoryId: form.categoryId || undefined,
        imageUrls: form.imageUrls,
        variants: form.variants
          .filter((v) => v.name.trim())
          .map((v) => ({
            name: v.name.trim(),
            price: parseFloat(v.price) || 0,
            compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : undefined,
            stock: parseInt(v.stock, 10) || 0,
            sku: v.sku.trim() || undefined,
            image: v.image ?? undefined,
          })),
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
  const formHasVariants = !!form && form.variants.some((v) => v.name.trim())

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
              {formHasVariants && (
                <p className="rounded-md bg-secondary/70 p-3 text-xs leading-relaxed text-muted-foreground sm:col-span-2">
                  Bu üründe <strong className="text-foreground">seçenekler tanımlı</strong> —
                  fiyat ve stok, seçeneklerden otomatik hesaplanır (fiyat: en düşük seçenek,
                  stok: seçeneklerin toplamı). Aşağıdaki alanlar bu yüzden kilitli.
                </p>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  Fiyat (TL) {formHasVariants ? "(seçeneklerden)" : "*"}
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={formHasVariants}
                  value={
                    formHasVariants
                      ? String(
                          Math.min(
                            ...form.variants
                              .filter((v) => v.name.trim())
                              .map((v) => parseFloat(v.price) || 0),
                          ),
                        )
                      : form.price
                  }
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className={cn(input, formHasVariants && "opacity-50")}
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
                  disabled={formHasVariants}
                  value={formHasVariants ? "" : form.compareAtPrice}
                  onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
                  className={cn(input, formHasVariants && "opacity-50")}
                  placeholder={formHasVariants ? "Seçenek bazında girilir" : "Boş bırakılabilir"}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  Stok {formHasVariants ? "(toplam)" : "*"}
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  disabled={formHasVariants}
                  value={
                    formHasVariants
                      ? String(
                          form.variants
                            .filter((v) => v.name.trim())
                            .reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0),
                        )
                      : form.stock
                  }
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className={cn(input, formHasVariants && "opacity-50")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  Stok Kodu (SKU)
                </label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                  className={cn(input, "font-mono uppercase")}
                  placeholder="Boş bırakılırsa otomatik atanır"
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
                          → Sana tahmini kargo maliyeti:{" "}
                          <strong className="text-accent">{formatPrice(cost)}</strong>
                          <span className="ml-1 text-xs text-muted-foreground">
                            (Ayarlar'daki desi maliyet tablosuna göre — müşteri fiyatını
                            etkilemez)
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

              {/* Varyantlar */}
              <div className="rounded-md border border-dashed border-accent/40 bg-secondary/30 p-4 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Seçenekler / Varyantlar
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        variants: [
                          ...form.variants,
                          { name: "", price: form.price || "", compareAtPrice: "", stock: "0", sku: "", image: null },
                        ],
                      })
                    }
                    className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent"
                  >
                    <Plus className="h-3.5 w-3.5" /> Seçenek Ekle
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  Boş bırakırsan ürün <strong>tek fiyat ve tek stokla</strong> satılır. Seçenek
                  eklersen (Büyük / Küçük / İkili Set gibi) müşteri seçim yapar; fiyat ve stok
                  her seçenek için ayrı tutulur. Görsel yüklemezsen ürünün ana görseli
                  gösterilmeye devam eder; stok kodunu boş bırakırsan otomatik atanır.
                </p>

                {form.variants.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="hidden gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[44px_1fr_90px_90px_70px_90px_32px]">
                      <span>Görsel</span>
                      <span>Seçenek Adı</span>
                      <span>Fiyat</span>
                      <span>İndirimsiz</span>
                      <span>Stok</span>
                      <span>Stok Kodu</span>
                      <span />
                    </div>
                    {form.variants.map((v, i) => {
                      const setVariant = (patch: Partial<typeof v>) => {
                        const variants = [...form.variants]
                        variants[i] = { ...v, ...patch }
                        setForm({ ...form, variants })
                      }
                      return (
                        <div
                          key={i}
                          className="grid gap-2 sm:grid-cols-[44px_1fr_90px_90px_70px_90px_32px] sm:items-center"
                        >
                          <div className="w-11">
                            <ImagePicker
                              value={v.image}
                              onChange={(url) => setVariant({ image: url })}
                              aspect="aspect-square"
                              className="h-11 w-11"
                            />
                          </div>
                          <input
                            value={v.name}
                            onChange={(e) => setVariant({ name: e.target.value })}
                            placeholder="Büyük (18 cm)"
                            className={input}
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={v.price}
                            onChange={(e) => setVariant({ price: e.target.value })}
                            placeholder="Fiyat"
                            className={input}
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={v.compareAtPrice}
                            onChange={(e) => setVariant({ compareAtPrice: e.target.value })}
                            placeholder="—"
                            className={input}
                          />
                          <input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) => setVariant({ stock: e.target.value })}
                            placeholder="Stok"
                            className={input}
                          />
                          <input
                            value={v.sku}
                            onChange={(e) => setVariant({ sku: e.target.value })}
                            placeholder="—"
                            className={input}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                variants: form.variants.filter((_, j) => j !== i),
                              })
                            }
                            className="flex h-9 w-8 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                            aria-label="Seçeneği sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
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
                        className={cn(
                          "h-20 w-20 rounded-md border-2 object-cover",
                          i === 0 ? "border-accent" : "border-border",
                        )}
                      />
                      {i === 0 ? (
                        <span className="absolute -left-1 -top-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground">
                          Kapak
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              imageUrls: [
                                url,
                                ...form.imageUrls.filter((_, j) => j !== i),
                              ],
                            })
                          }
                          className="absolute inset-x-1 bottom-1 hidden rounded bg-foreground/80 py-1 text-center text-[9px] font-bold text-background backdrop-blur group-hover:block"
                        >
                          Kapak Yap
                        </button>
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
                  Kapak görselini istediğin zaman "Kapak Yap" ile değiştirebilirsin. JPEG/PNG/WebP, max 10 MB.
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

      {/* Toplu işlem çubuğu */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent/50 bg-card px-4 py-2.5">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">
            {selected.size} seçili
          </span>
          <button
            disabled={bulkBusy}
            onClick={() => void bulkSetActive(true)}
            className="h-8 rounded-md border border-border px-4 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Satışa Aç
          </button>
          <button
            disabled={bulkBusy}
            onClick={() => void bulkSetActive(false)}
            className="h-8 rounded-md border border-border px-4 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Satıştan Kaldır
          </button>
          <button
            disabled={bulkBusy}
            onClick={() => void bulkDelete()}
            className="flex h-8 items-center gap-1.5 rounded-md border border-destructive/40 px-4 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" /> Seçilenleri Sil
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Seçimi temizle
          </button>
        </div>
      )}

      {/* Tablo */}
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={!!products && products.length > 0 && selected.size === products.length}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked && products
                        ? new Set(products.map((p) => p.id))
                        : new Set(),
                    )
                  }
                  className="h-4 w-4 accent-[oklch(0.63_0.065_75)]"
                  aria-label="Tümünü seç"
                />
              </th>
              {(
                [
                  ["name", "Ürün"],
                  [null, "Kategori"],
                  ["price", "Fiyat"],
                  ["stock", "Stok"],
                  ["isActive", "Durum"],
                ] as const
              ).map(([key, labelText]) => (
                <th key={labelText} className="px-4 py-3">
                  {key ? (
                    <button
                      onClick={() => toggleSort(key)}
                      className={cn(
                        "flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground",
                        sortBy === key && "text-foreground",
                      )}
                    >
                      {labelText}
                      <span className="text-[9px]">
                        {sortBy === key ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    labelText
                  )}
                </th>
              ))}
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedProducts === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                </td>
              </tr>
            ) : sortedProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  Ürün bulunamadı.
                </td>
              </tr>
            ) : (
              sortedProducts.map((p) => (
                <tr
                  key={p.id}
                  className={
                    "transition-colors hover:bg-secondary/40 " +
                    (selected.has(p.id) ? "bg-secondary/50" : "")
                  }
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={(e) => toggleSelect(p.id, e.target.checked)}
                      className="h-4 w-4 accent-[oklch(0.63_0.065_75)]"
                      aria-label={`${p.name} seç`}
                    />
                  </td>
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
                        <p className="text-xs text-muted-foreground">
                          /{p.slug}
                          {p.sku && (
                            <span className="ml-2 font-mono text-[10px] text-accent">
                              {p.sku}
                            </span>
                          )}
                        </p>
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
