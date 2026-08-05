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
import { HeroGallery } from "@/components/site/hero-gallery"
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
      .then((cats) =>
        setCategories(
          cats
            .filter((c) => c.showOnHomepage !== false)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .slice(0, 5),
        ),
      )
      .catch(() => {})
  }, [])

  const heroImages = [...hp.heroImages, ...DEFAULT_HOMEPAGE.heroImages].slice(0, 4)

  const bgType = hp.heroBackgroundType ?? "collage"
  const fullBg =
    (bgType === "video" && hp.heroBackgroundVideo) ||
    (bgType === "image" && hp.heroBackgroundImage)
      ? bgType
      : null
  const overlay = Math.min(80, Math.max(0, hp.heroOverlayOpacity ?? 40)) / 100

  if (fullBg) {
    return (
      <>
        {/* ===== Hero: tam ekran video/görsel arkaplan ===== */}
        <section className="relative flex min-h-[72vh] items-center justify-center overflow-hidden lg:min-h-[86vh]">
          {fullBg === "video" ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={hp.heroBackgroundImage ? imageUrl(hp.heroBackgroundImage) : undefined}
              src={imageUrl(hp.heroBackgroundVideo)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(hp.heroBackgroundImage)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: overlay }}
            aria-hidden
          />
          <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center text-white sm:px-6">
            <p className="eyebrow mb-4 text-white/80">{hp.heroEyebrow}</p>
            <h1 className="font-display text-[2.65rem] leading-[1.06] sm:text-6xl lg:text-7xl">
              {hp.heroTitle}{" "}
              <span className="italic text-accent">{hp.heroTitleAccent}</span>
              {hp.heroTitleSuffix}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[0.95rem] leading-relaxed text-white/85 sm:text-lg">
              {hp.heroSubtitle}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href={hp.heroPrimaryUrl || "/urunler"}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-semibold tracking-wide text-primary-foreground transition-all hover:bg-accent sm:w-auto"
              >
                {hp.heroPrimaryText}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              {hp.heroSecondaryText && (
                <Link
                  href={hp.heroSecondaryUrl || "/hediye-karti"}
                  className="inline-flex h-12 w-full items-center justify-center rounded-md border border-white/40 px-8 text-sm font-semibold tracking-wide text-white transition-colors hover:border-accent hover:text-accent sm:w-auto"
                >
                  {hp.heroSecondaryText}
                </Link>
              )}
            </div>
            {hp.heroBadge && (
              <p className="eyebrow mt-10 text-accent">{hp.heroBadge}</p>
            )}
          </div>
        </section>
        <HomeSections hp={hp} featured={featured} categories={categories} />
      </>
    )
  }

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        {/* Mobil: tam genişlikte kaydırmalı galeri, metin altında */}
        <div className="lg:hidden">
          <HeroGallery images={heroImages} badge={hp.heroBadge} />
          <div className="px-4 pb-12 pt-6 sm:px-6">
            <p className="eyebrow mb-3">{hp.heroEyebrow}</p>
            <h1 className="font-display text-[2.65rem] leading-[1.06] sm:text-5xl">
              {hp.heroTitle}{" "}
              <span className="italic text-accent">{hp.heroTitleAccent}</span>
              {hp.heroTitleSuffix}
            </h1>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-muted-foreground">
              {hp.heroSubtitle}
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <Link
                href={hp.heroPrimaryUrl || "/urunler"}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold tracking-wide text-primary-foreground"
              >
                {hp.heroPrimaryText}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {hp.heroSecondaryText && (
                <Link
                  href={hp.heroSecondaryUrl || "/hediye-karti"}
                  className="inline-flex h-12 items-center justify-center rounded-md border border-foreground/20 text-sm font-semibold tracking-wide"
                >
                  {hp.heroSecondaryText}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Masaüstü: metin + görsel kolajı */}
        <div className="mx-auto hidden max-w-7xl gap-16 px-6 pb-24 pt-20 lg:grid lg:grid-cols-2 lg:items-center">
          <div className="max-w-xl">
            <p className="eyebrow mb-5">{hp.heroEyebrow}</p>
            <h1 className="font-display text-6xl leading-[1.05] lg:text-7xl">
              {hp.heroTitle}
              <br />
              <span className="italic text-accent">{hp.heroTitleAccent}</span>
              {hp.heroTitleSuffix}
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
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
              <div className="absolute -left-6 top-1/2 flex h-28 w-28 -translate-y-1/2 items-center justify-center rounded-full border border-accent/40 bg-background/90 text-center backdrop-blur">
                <p className="whitespace-pre-line font-display text-sm italic leading-tight text-accent">
                  {hp.heroBadge.split(" ").join("\n")}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <HomeSections hp={hp} featured={featured} categories={categories} />
    </>
  )
}

function HomeSections({
  hp,
  featured,
  categories,
}: {
  hp: HomepageSettings
  featured: Product[] | null
  categories: Category[]
}) {
  return (
    <>
      {/* ===== Değerler bandı ===== */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-6 px-4 py-7 sm:px-6 sm:gap-6 lg:grid-cols-4 lg:py-8">
          {hp.values.slice(0, 4).map((v, i) => {
            const Icon = VALUE_ICONS[i % VALUE_ICONS.length]
            return (
              <div key={i} className="flex items-start gap-3 sm:items-center sm:gap-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent sm:mt-0 sm:h-6 sm:w-6" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-[0.8rem] font-semibold leading-snug sm:text-sm">{v.title}</p>
                  <p className="text-[0.7rem] leading-snug text-muted-foreground sm:text-xs">
                    {v.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ===== Kategoriler ===== */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
          <div className="mb-6 flex items-end justify-between sm:mb-10">
            <div>
              <p className="eyebrow mb-2 sm:mb-3">{hp.categoriesEyebrow}</p>
              <h2 className="font-display text-[1.75rem] sm:text-4xl">{hp.categoriesTitle}</h2>
            </div>
            <Link
              href="/urunler"
              className="flex shrink-0 items-center gap-1 pb-1 text-xs font-medium text-accent hover:underline sm:text-sm"
            >
              Tümünü Gör <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {/* Mobilde yatay kaydırma, tablet+ grid */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/urunler?category=${cat.slug}`}
                className="group relative w-[44%] shrink-0 snap-start overflow-hidden rounded-md sm:w-auto"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(
                    cat.image ?? FALLBACK_CATEGORY_IMAGES[cat.slug] ?? "/products/placeholder-3.png",
                  )}
                  alt={cat.name}
                  className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
                <p className="absolute bottom-3 left-3 right-3 font-display text-base text-background sm:bottom-4 sm:left-4 sm:right-4 sm:text-lg">
                  {cat.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== Öne çıkanlar ===== */}
      <section className="bg-card">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
          <div className="mb-6 flex items-end justify-between sm:mb-10">
            <div>
              <p className="eyebrow mb-2 sm:mb-3">{hp.featuredEyebrow}</p>
              <h2 className="font-display text-[1.75rem] sm:text-4xl">{hp.featuredTitle}</h2>
            </div>
            <Link
              href="/urunler"
              className="hidden items-center gap-1 text-sm font-medium text-accent hover:underline sm:flex"
            >
              Tüm Koleksiyon <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4">
            {featured === null
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : featured.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <div className="mt-8 sm:hidden">
            <Link
              href="/urunler"
              className="flex h-12 items-center justify-center rounded-md border border-foreground/20 text-sm font-semibold"
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
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
        <div className="grid items-center gap-0 overflow-hidden rounded-lg border border-border bg-gradient-to-br from-secondary via-card to-secondary/50 lg:grid-cols-2 lg:gap-10">
          <div className="p-6 sm:p-12 lg:p-16">
            <p className="eyebrow mb-3 sm:mb-4">{hp.giftEyebrow}</p>
            <h2 className="font-display text-[1.75rem] leading-tight sm:text-4xl">
              {hp.giftTitle}{" "}
              <span className="italic text-accent">{hp.giftTitleAccent}</span>
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
              {hp.giftText}
            </p>
            <Link
              href="/hediye-karti"
              className="group mt-6 flex h-12 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent sm:mt-8 sm:inline-flex sm:px-8"
            >
              {hp.giftButtonText}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          {/* Kart görseli: mobilde de görünür */}
          <div className="relative h-full min-h-[200px] px-6 pb-8 sm:min-h-[260px] lg:min-h-[320px] lg:px-0 lg:pb-0">
            <div className="flex h-full items-center justify-center lg:absolute lg:inset-0 lg:p-10">
              <div className="relative aspect-[8/5] w-full max-w-sm rotate-3 rounded-xl bg-primary p-5 text-primary-foreground shadow-2xl transition-transform duration-500 hover:rotate-0 sm:p-6">
                <p className="text-xl text-accent sm:text-2xl">
                  <Brand />
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.3em] text-primary-foreground/60 sm:text-[10px]">
                  Hediye Kartı
                </p>
                <p className="absolute bottom-5 left-5 font-mono text-xs tracking-[0.2em] text-primary-foreground/80 sm:bottom-6 sm:left-6 sm:text-sm">
                  GIFT-••••-••••
                </p>
                <p className="absolute bottom-4 right-5 font-display text-2xl text-accent sm:bottom-6 sm:right-6">
                  ₺
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Marka hikayesi ===== */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-16 lg:py-24">
          <p className="eyebrow mb-3 sm:mb-4">{hp.storyEyebrow}</p>
          <h2 className="font-display text-2xl leading-snug sm:text-4xl lg:text-[2.75rem]">
            {hp.storyQuote}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-base">
            {hp.storyText}
          </p>
          <Link
            href="/hakkimizda"
            className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline sm:mt-8"
          >
            Hikâyemizi Okuyun <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
