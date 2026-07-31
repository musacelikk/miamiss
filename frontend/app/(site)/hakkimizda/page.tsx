"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  BookOpen,
  Gem,
  HandHeart,
  Instagram,
  Leaf,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react"
import { toast } from "sonner"
import { Brand } from "@/components/brand"
import { api, type StoreSettings } from "@/lib/api"
import { cn } from "@/lib/utils"
import { sanitizeName } from "@/lib/input"

const TABS = [
  { key: "hikayemiz", label: "Hikâyemiz", icon: BookOpen },
  { key: "iletisim", label: "İletişim", icon: MessageCircle },
] as const

type TabKey = (typeof TABS)[number]["key"]

/* ---- Hikâyemiz ---- */

function StoryTab() {
  return (
    <div>
      <p className="eyebrow mb-4">Hikâyemiz</p>
      <h2 className="font-display text-3xl leading-tight sm:text-4xl lg:text-5xl">
        Taşın milyonlarca yıllık hikâyesini
        <br />
        <span className="italic text-accent">evinize taşıyoruz</span>
      </h2>
      <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground">
        Miamisu Home, Anadolu topraklarının en değerli doğal taşlarını — traverteni
        ve mermeri — çağdaş tasarımla buluşturmak için kuruldu. Her ürünümüz,
        taş ocaklarından özenle seçilen bloklardan usta ellerde tek tek
        şekillendirilir; gözenekleri, damarları ve tonlarıyla dünyada eşi
        olmayan bir parça olarak evinize ulaşır.
      </p>

      <div className="mt-12 grid gap-8 sm:grid-cols-3">
        {[
          {
            icon: Gem,
            title: "Doğal Malzeme",
            desc: "Yalnızca gerçek traverten, mermer ve seramik kullanırız. Suni taş, kalıp ürün ya da imitasyon asla.",
          },
          {
            icon: HandHeart,
            title: "El İşçiliği",
            desc: "Her parça tek tek kesilir, oyulur ve elle zımparalanır. Bu yüzden iki ürün asla birbirinin aynısı değildir.",
          },
          {
            icon: Leaf,
            title: "Sürdürülebilirlik",
            desc: "Üretim artığı taş tozları geri kazanılır, paketlemede geri dönüştürülebilir malzeme kullanılır.",
          },
        ].map((v) => (
          <div key={v.title} className="rounded-md border border-border bg-card p-6">
            <v.icon className="h-7 w-7 text-accent" strokeWidth={1.3} />
            <h3 className="mt-4 font-display text-xl">{v.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-md bg-primary p-8 text-center text-primary-foreground sm:p-10">
        <p className="font-display text-2xl italic sm:text-3xl">
          “Evinize de taşın zarafeti yakışır”
        </p>
        <Link
          href="/urunler"
          className="group mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-accent px-7 text-sm font-semibold text-accent-foreground transition-all hover:brightness-110"
        >
          Koleksiyonu Keşfet
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  )
}

/* ---- İletişim ---- */

function ContactTab() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<StoreSettings>("/settings", { auth: false }).then(setSettings).catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await api<{ message: string }>("/contact", {
        method: "POST",
        body: JSON.stringify(form),
        auth: false,
      })
      toast.success(res.message)
      setForm({ name: "", email: "", subject: "", message: "" })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mesaj gönderilemedi")
    } finally {
      setBusy(false)
    }
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  return (
    <div>
      <p className="eyebrow mb-4">İletişim</p>
      <h2 className="font-display text-3xl leading-tight sm:text-4xl">
        Size Nasıl <span className="italic text-accent">Yardımcı</span> Olabiliriz?
      </h2>

      {/* İletişim kanalları */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {settings?.contactEmail && (
          <a
            href={`mailto:${settings.contactEmail}`}
            className="flex items-center gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:border-accent"
          >
            <Mail className="h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">E-posta</p>
              <p className="truncate text-sm font-semibold">{settings.contactEmail}</p>
            </div>
          </a>
        )}
        {settings?.contactPhone && (
          <a
            href={`tel:${settings.contactPhone}`}
            className="flex items-center gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:border-accent"
          >
            <Phone className="h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Telefon</p>
              <p className="text-sm font-semibold">{settings.contactPhone}</p>
            </div>
          </a>
        )}
        {settings?.instagram && (
          <a
            href={`https://instagram.com/${settings.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:border-accent"
          >
            <Instagram className="h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Instagram</p>
              <p className="text-sm font-semibold">@{settings.instagram}</p>
            </div>
          </a>
        )}
        {settings?.address && (
          <div className="flex items-center gap-4 rounded-md border border-border bg-card p-4">
            <MapPin className="h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Adres</p>
              <p className="truncate text-sm font-semibold">{settings.address}</p>
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={submit} className="mt-8 rounded-md border border-border bg-card p-6 sm:p-8">
        <h3 className="font-display text-2xl">Bize Yazın</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Adınız *</label>
            <input
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: sanitizeName(e.target.value) })}
              className={input}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">E-posta *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={input}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Konu</label>
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className={input}
              placeholder="Sipariş, iade, ürün sorusu..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Mesajınız *</label>
            <textarea
              required
              minLength={5}
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className={input}
            />
          </div>
        </div>
        <button
          disabled={busy}
          className="mt-6 flex h-11 items-center gap-2 rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Gönder
        </button>
      </form>
    </div>
  )
}

/* ---- Sayfa ---- */

function AboutContent() {
  const router = useRouter()
  const params = useSearchParams()
  const tabParam = params.get("tab")
  const active: TabKey = tabParam === "iletisim" ? "iletisim" : "hikayemiz"

  const setTab = (key: TabKey) => {
    router.replace(key === "hikayemiz" ? "/hakkimizda" : `/hakkimizda?tab=${key}`, {
      scroll: false,
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-16">
        {/* Sol sekmeler */}
        <aside>
          <div className="lg:sticky lg:top-32">
            <p className="mb-4 hidden text-2xl lg:block">
              <Brand />
            </p>
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:border-l lg:border-border lg:pb-0">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTab(tab.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-medium transition-all lg:-ml-px lg:rounded-none lg:border-0 lg:border-l-2 lg:px-5 lg:py-3",
                    active === tab.key
                      ? "border-primary bg-primary text-primary-foreground lg:border-accent lg:bg-transparent lg:text-accent"
                      : "border-border text-muted-foreground hover:text-foreground lg:border-transparent",
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Yardımcı linkler */}
            <div className="mt-8 hidden space-y-2.5 border-t border-border pt-6 text-sm lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Yardım
              </p>
              {[
                { href: "/siparis-takip", label: "Sipariş Takibi" },
                { href: "/iade-degisim", label: "İade & Değişim" },
                { href: "/mesafeli-satis", label: "Mesafeli Satış" },
                { href: "/kvkk", label: "KVKK" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block text-muted-foreground transition-colors hover:text-accent"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* İçerik */}
        <div className="min-w-0">
          {active === "hikayemiz" ? <StoryTab /> : <ContactTab />}
        </div>
      </div>
    </div>
  )
}

export default function AboutPage() {
  return (
    <Suspense>
      <AboutContent />
    </Suspense>
  )
}
