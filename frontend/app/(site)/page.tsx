"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Gem, HandHeart, Package, Truck } from "lucide-react"
import {
  api,
  DEFAULT_HOMEPAGE,
  imageUrl,
  type Category,
  type HomepageSettings,
  type Product,
} from "@/lib/api"
import { ProductCard, ProductCardSkeleton } from "@/components/site/product-card"
import { WordPuzzle } from "@/components/site/word-puzzle"
import { RecentlyViewed } from "@/components/site/recently-viewed"
import { Brand } from "@/components/brand"

const FALLBACK_CATEGORY_IMAGES: Record<string, string> = {
  mumluklar: "/products/placeholder-5.jpg",
  "dekoratif-tabaklar": "/products/placeholder-1.jpg",
  "sunum-mutfak": "/products/placeholder-4.jpg",
  kutular: "/products/placeholder-6.jpg",
  vazolar: "/products/placeholder-2.png",
}

const VALUE_ICONS = [Gem, HandHeart, Truck, Package]

export default function HomePage() {
  const [hp, setHp] = useState<HomepageSettings>(DEFAULT_HOMEPAGE)
  const [featured, setFeatured] = useState<Product[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    api<HomepageSettings>("/settings/homepage", { auth: false })
      .then((s) => setHp({ ...DEFAULT_HOMEPAGE, ...s }))
      .catch(() => {})
    api<{ items: Product[] }>("/products?featured=true&limit=8", { auth: false })
      .then((res) => setFeatured(res.items))
      .catch(() => setFeatured([]))
    api<Category[]>("/categories", { auth: false })
      .then(setCategories)
      .catch(() => {})
  }, [])

  const heroImages = [...hp.heroImages, ...DEFAULT_HOMEPAGE.heroImages].slice(0, 4)

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="max-w-xl">
            <p className="eyebrow mb-5">{hp.heroEyebrow}</p>
            <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
              {hp.heroTitle}
              <br />
              <span className="italic text-accent">{hp.heroTitleAccent}</span>
              {hp.heroTitleSuffix}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              {hp.heroSubtitle}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href={hp.heroPrimaryUrl || "/urunler"}
                className="group inline-flex h-12 items-center gap-2 rounded-md bg-primary px-8 text-sm font-semibold tracking-wide text-primary-foreground transition-all hover:bg-accent"
              >
                {hp.heroPrimaryText}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              {hp.heroSecondaryText && (
                <Link
                  href={hp.heroSecondaryUrl || "/hediye-karti"}
                  className="inline-flex h-12 items-center rounded-md border border-foreground/20 px-8 text-sm font-semibold tracking-wide transition-colors hover:border-accent hover:text-accent"
                >
                  {hp.heroSecondaryText}
                </Link>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(heroImages[0])}
                    alt="Miamisu Home"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
                <div className="overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(heroImages[1])}
                    alt="Miamisu Home"
                    className="aspect-square w-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-10">
                <div className="overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(heroImages[2])}
                    alt="Miamisu Home"
                    className="aspect-square w-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
                <div className="overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(heroImages[3])}
                    alt="Miamisu Home"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
              </div>
            </div>
            {hp.heroBadge && (
              <div className="absolute -left-6 top-1/2 hidden h-28 w-28 -translate-y-1/2 items-center justify-center rounded-full border border-accent/40 bg-background/90 text-center backdrop-blur lg:flex">
                <p className="whitespace-pre-line font-display text-sm italic leading-tight text-accent">
                  {hp.heroBadge.split(" ").join("\n")}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Değerler bandı ===== */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
          {hp.values.slice(0, 4).map((v, i) => {
            const Icon = VALUE_ICONS[i % VALUE_ICONS.length]
            return (
              <div key={i} className="flex items-center gap-4">
                <Icon className="h-6 w-6 shrink-0 text-accent" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-semibold">{v.title}</p>
                  <p className="text-xs text-muted-foreground">{v.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ===== Kategoriler ===== */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="eyebrow mb-3">{hp.categoriesEyebrow}</p>
              <h2 className="font-display text-3xl sm:text-4xl">{hp.categoriesTitle}</h2>
            </div>
            <Link
              href="/urunler"
              className="hidden items-center gap-1 text-sm font-medium text-accent hover:underline sm:flex"
            >
              Tümünü Gör <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/urunler?category=${cat.slug}`}
                className="group relative overflow-hidden rounded-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(
                    cat.image ?? FALLBACK_CATEGORY_IMAGES[cat.slug] ?? "/products/placeholder-3.png",
                  )}
                  alt={cat.name}
                  className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
                <p className="absolute bottom-4 left-4 right-4 font-display text-lg text-background">
                  {cat.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== Öne çıkanlar ===== */}
      <section className="bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="eyebrow mb-3">{hp.featuredEyebrow}</p>
              <h2 className="font-display text-3xl sm:text-4xl">{hp.featuredTitle}</h2>
            </div>
            <Link
              href="/urunler"
              className="hidden items-center gap-1 text-sm font-medium text-accent hover:underline sm:flex"
            >
              Tüm Koleksiyon <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {featured === null
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : featured.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <div className="mt-10 text-center sm:hidden">
            <Link
              href="/urunler"
              className="inline-flex h-11 items-center rounded-md border border-foreground/20 px-8 text-sm font-semibold"
            >
              Tüm Koleksiyon
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Son gezilenler ===== */}
      <RecentlyViewed />

      {/* ===== Kelime bulmacası ===== */}
      <WordPuzzle />

      {/* ===== Hediye kartı ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid items-center gap-10 overflow-hidden rounded-lg border border-border bg-gradient-to-br from-secondary via-card to-secondary/50 lg:grid-cols-2">
          <div className="p-8 sm:p-12 lg:p-16">
            <p className="eyebrow mb-4">{hp.giftEyebrow}</p>
            <h2 className="font-display text-3xl leading-tight sm:text-4xl">
              {hp.giftTitle}
              <br />
              <span className="italic text-accent">{hp.giftTitleAccent}</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {hp.giftText}
            </p>
            <Link
              href="/hediye-karti"
              className="group mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
            >
              {hp.giftButtonText}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="relative hidden h-full min-h-[320px] lg:block">
            <div className="absolute inset-0 flex items-center justify-center p-10">
              <div className="relative aspect-[8/5] w-full max-w-sm rotate-3 rounded-xl bg-primary p-6 text-primary-foreground shadow-2xl transition-transform duration-500 hover:rotate-0">
                <p className="text-2xl text-accent">
                  <Brand />
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-primary-foreground/60">
                  Hediye Kartı
                </p>
                <p className="absolute bottom-6 left-6 font-mono text-sm tracking-[0.2em] text-primary-foreground/80">
                  GIFT-••••-••••
                </p>
                <p className="absolute bottom-6 right-6 font-display text-2xl text-accent">₺</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Marka hikayesi ===== */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <p className="eyebrow mb-4">{hp.storyEyebrow}</p>
          <h2 className="font-display text-3xl leading-snug sm:text-4xl lg:text-[2.75rem]">
            {hp.storyQuote}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {hp.storyText}
          </p>
          <Link
            href="/hakkimizda"
            className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
          >
            Hikâyemizi Okuyun <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
