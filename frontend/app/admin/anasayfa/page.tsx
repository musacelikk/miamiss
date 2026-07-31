"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  api,
  DEFAULT_HOMEPAGE,
  type Category,
  type HomepageSettings,
  type StoreSettings,
} from "@/lib/api"
import { ImagePicker } from "@/components/admin/image-picker"

export default function AdminHomepagePage() {
  const [hp, setHp] = useState<HomepageSettings | null>(null)
  const [announcement, setAnnouncement] = useState({ announcement: "", announcementUrl: "" })
  const [categories, setCategories] = useState<Category[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<HomepageSettings>("/settings/homepage", { auth: false })
      .then((s) => setHp({ ...DEFAULT_HOMEPAGE, ...s }))
      .catch((e) => toast.error(e.message))
    api<StoreSettings>("/settings", { auth: false })
      .then((s) =>
        setAnnouncement({
          announcement: s.announcement ?? "",
          announcementUrl: s.announcementUrl ?? "",
        }),
      )
      .catch(() => {})
    api<Category[]>("/categories", { auth: false }).then(setCategories).catch(() => {})
  }, [])

  if (!hp) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-accent" />
      </div>
    )
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const [updated] = await Promise.all([
        api<HomepageSettings>("/admin/settings/homepage", {
          method: "PUT",
          body: JSON.stringify(hp),
        }),
        api("/admin/settings", { method: "PUT", body: JSON.stringify(announcement) }),
      ])
      setHp({ ...DEFAULT_HOMEPAGE, ...updated })
      toast.success("Anasayfa güncellendi")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi")
    } finally {
      setBusy(false)
    }
  }

  const patchCategory = async (cat: Category, patch: Partial<Category>, quiet = false) => {
    try {
      await api(`/admin/categories/${cat.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: cat.name,
          sortOrder: patch.sortOrder ?? cat.sortOrder,
          image: patch.image !== undefined ? patch.image : (cat.image ?? null),
          showOnHomepage: patch.showOnHomepage ?? cat.showOnHomepage ?? true,
        }),
      })
      setCategories((prev) =>
        prev
          .map((c) => (c.id === cat.id ? { ...c, ...patch } : c))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      )
      if (!quiet) toast.success(`${cat.name} güncellendi`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi")
    }
  }

  const saveCategoryImage = (cat: Category, image: string | null) =>
    patchCategory(cat, { image })

  /** Komsu kategoriyle sira degeri takasi */
  const moveCategory = async (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= categories.length) return
    const a = categories[index]
    const b = categories[target]
    await Promise.all([
      patchCategory(a, { sortOrder: b.sortOrder }, true),
      patchCategory(b, { sortOrder: a.sortOrder }, true),
    ])
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
  const label = "mb-1.5 block text-xs font-semibold"
  const set = (key: keyof HomepageSettings) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setHp({ ...hp, [key]: e.target.value })

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Buradaki her alan anasayfada anında yansır.
        </p>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
        >
          Anasayfayı Aç <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">

      {/* Duyuru bandı */}
      <section className="rounded-md border border-border bg-card p-6 xl:col-span-2">
        <h2 className="font-display text-xl">Duyuru Bandı (sitenin en üstündeki şerit)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Metin (boşsa şerit gizlenir)</label>
            <input
              value={announcement.announcement}
              onChange={(e) =>
                setAnnouncement({ ...announcement, announcement: e.target.value })
              }
              className={input}
              placeholder="1500 TL üzeri siparişlerde kargo ücretsiz ✨"
            />
          </div>
          <div>
            <label className={label}>Tıklanınca Gidilecek Link (isteğe bağlı)</label>
            <input
              value={announcement.announcementUrl}
              onChange={(e) =>
                setAnnouncement({ ...announcement, announcementUrl: e.target.value })
              }
              className={input}
              placeholder="/urunler?category=vazolar"
            />
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="rounded-md border border-border bg-card p-6 xl:col-span-2">
        <h2 className="font-display text-xl">Hero (Üst Bölüm)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Üst Etiket</label>
            <input value={hp.heroEyebrow} onChange={set("heroEyebrow")} className={input} />
          </div>
          <div>
            <label className={label}>Başlık (ilk satır)</label>
            <input value={hp.heroTitle} onChange={set("heroTitle")} className={input} />
          </div>
          <div>
            <label className={label}>Vurgulu Kelime (italik/bronz)</label>
            <input value={hp.heroTitleAccent} onChange={set("heroTitleAccent")} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Başlık Devamı</label>
            <input value={hp.heroTitleSuffix} onChange={set("heroTitleSuffix")} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Alt Başlık</label>
            <textarea rows={3} value={hp.heroSubtitle} onChange={set("heroSubtitle")} className={input} />
          </div>
          <div>
            <label className={label}>1. Buton Yazısı</label>
            <input value={hp.heroPrimaryText} onChange={set("heroPrimaryText")} className={input} />
          </div>
          <div>
            <label className={label}>1. Buton Linki</label>
            <input value={hp.heroPrimaryUrl} onChange={set("heroPrimaryUrl")} className={input} />
          </div>
          <div>
            <label className={label}>2. Buton Yazısı (boşsa gizlenir)</label>
            <input value={hp.heroSecondaryText} onChange={set("heroSecondaryText")} className={input} />
          </div>
          <div>
            <label className={label}>2. Buton Linki</label>
            <input value={hp.heroSecondaryUrl} onChange={set("heroSecondaryUrl")} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Yuvarlak Rozet Yazısı (boşsa gizlenir)</label>
            <input value={hp.heroBadge} onChange={set("heroBadge")} className={input} />
          </div>
        </div>

        <label className={`${label} mt-5`}>Hero Görselleri (4 adet kolaj)</label>
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <ImagePicker
              key={i}
              value={hp.heroImages[i] ?? null}
              onChange={(url) => {
                const next = [...hp.heroImages]
                next[i] = url ?? DEFAULT_HOMEPAGE.heroImages[i]
                setHp({ ...hp, heroImages: next })
              }}
            />
          ))}
        </div>
      </section>

      {/* Değerler */}
      <section className="rounded-md border border-border bg-card p-6">
        <h2 className="font-display text-xl">Değerler Bandı (4 madde)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {hp.values.slice(0, 4).map((v, i) => (
            <div key={i} className="rounded-md border border-border p-4">
              <label className={label}>Başlık {i + 1}</label>
              <input
                value={v.title}
                onChange={(e) => {
                  const values = [...hp.values]
                  values[i] = { ...values[i], title: e.target.value }
                  setHp({ ...hp, values })
                }}
                className={input}
              />
              <label className={`${label} mt-3`}>Açıklama</label>
              <input
                value={v.desc}
                onChange={(e) => {
                  const values = [...hp.values]
                  values[i] = { ...values[i], desc: e.target.value }
                  setHp({ ...hp, values })
                }}
                className={input}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Bölüm başlıkları */}
      <section className="rounded-md border border-border bg-card p-6">
        <h2 className="font-display text-xl">Bölüm Başlıkları</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Kategoriler — Etiket</label>
            <input value={hp.categoriesEyebrow} onChange={set("categoriesEyebrow")} className={input} />
          </div>
          <div>
            <label className={label}>Kategoriler — Başlık</label>
            <input value={hp.categoriesTitle} onChange={set("categoriesTitle")} className={input} />
          </div>
          <div>
            <label className={label}>Öne Çıkanlar — Etiket</label>
            <input value={hp.featuredEyebrow} onChange={set("featuredEyebrow")} className={input} />
          </div>
          <div>
            <label className={label}>Öne Çıkanlar — Başlık</label>
            <input value={hp.featuredTitle} onChange={set("featuredTitle")} className={input} />
          </div>
        </div>
      </section>

      {/* Kategori görselleri */}
      {categories.length > 0 && (
        <section className="rounded-md border border-border bg-card p-6 xl:col-span-2">
          <h2 className="font-display text-xl">Kategori Görselleri</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Anasayfadaki kategori kartlarında kullanılır.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Anasayfada en fazla 5 kategori, buradaki sırayla gösterilir. Göz ikonuyla
            gizleyebilir, oklarla sırayı değiştirebilirsiniz.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-5">
            {categories.map((cat, i) => {
              const hidden = cat.showOnHomepage === false
              return (
                <div key={cat.id} className={hidden ? "opacity-45" : undefined}>
                  <ImagePicker
                    value={cat.image ?? null}
                    onChange={(url) => void saveCategoryImage(cat, url)}
                    aspect="aspect-[3/4]"
                  />
                  <p className="mt-1.5 truncate text-center text-xs font-medium">
                    {i < 5 && !hidden && (
                      <span className="mr-1 text-accent">{i + 1}.</span>
                    )}
                    {cat.name}
                  </p>
                  <div className="mt-1.5 flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => void moveCategory(i, -1)}
                      disabled={i === 0}
                      className="rounded border border-border p-1.5 text-muted-foreground hover:border-accent hover:text-accent disabled:opacity-30"
                      aria-label="Yukarı taşı"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveCategory(i, 1)}
                      disabled={i === categories.length - 1}
                      className="rounded border border-border p-1.5 text-muted-foreground hover:border-accent hover:text-accent disabled:opacity-30"
                      aria-label="Aşağı taşı"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void patchCategory(cat, { showOnHomepage: hidden })
                      }
                      className={
                        "rounded border p-1.5 " +
                        (hidden
                          ? "border-border text-muted-foreground hover:border-accent hover:text-accent"
                          : "border-accent bg-accent/10 text-accent")
                      }
                      aria-label={hidden ? "Anasayfada göster" : "Anasayfadan gizle"}
                    >
                      {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Hediye kartı bölümü */}
      <section className="rounded-md border border-border bg-card p-6">
        <h2 className="font-display text-xl">Hediye Kartı Bölümü</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Etiket</label>
            <input value={hp.giftEyebrow} onChange={set("giftEyebrow")} className={input} />
          </div>
          <div>
            <label className={label}>Buton Yazısı</label>
            <input value={hp.giftButtonText} onChange={set("giftButtonText")} className={input} />
          </div>
          <div>
            <label className={label}>Başlık (ilk satır)</label>
            <input value={hp.giftTitle} onChange={set("giftTitle")} className={input} />
          </div>
          <div>
            <label className={label}>Başlık (vurgulu satır)</label>
            <input value={hp.giftTitleAccent} onChange={set("giftTitleAccent")} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Açıklama</label>
            <textarea rows={3} value={hp.giftText} onChange={set("giftText")} className={input} />
          </div>
        </div>
      </section>

      {/* Marka hikayesi */}
      <section className="rounded-md border border-border bg-card p-6">
        <h2 className="font-display text-xl">Marka Hikâyesi Bölümü</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className={label}>Etiket</label>
            <input value={hp.storyEyebrow} onChange={set("storyEyebrow")} className={input} />
          </div>
          <div>
            <label className={label}>Alıntı (büyük başlık)</label>
            <textarea rows={2} value={hp.storyQuote} onChange={set("storyQuote")} className={input} />
          </div>
          <div>
            <label className={label}>Paragraf</label>
            <textarea rows={3} value={hp.storyText} onChange={set("storyText")} className={input} />
          </div>
        </div>
      </section>

      </div>

      <button
        disabled={busy}
        className="flex h-11 items-center gap-2 rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Kaydet
      </button>
    </form>
  )
}
