import { cn } from "@/lib/utils"

/**
 * Blog kapagi. Yazinin kapak gorseli varsa onu, yoksa slug'dan turetilen
 * deterministik bir "traverten" dokusu cizer.
 *
 * Fallback onemli: BlogProduce'tan API ile uretilen yazilar coklukla
 * coverImageUrl: null ile gelir. Gri bos kutu yerine markaya uygun, her
 * yazida ayni kalan (slug hash'i) bir doku daha iyi duruyor.
 */

/** Traverten paletinden secilmis zemin tonlari — hepsi sicak, markayla uyumlu. */
const PRESETS = [
  { base: "oklch(0.86 0.038 82)", glow: "oklch(0.95 0.020 90)", deep: "oklch(0.64 0.060 66)" },
  { base: "oklch(0.83 0.046 74)", glow: "oklch(0.94 0.024 84)", deep: "oklch(0.59 0.065 60)" },
  { base: "oklch(0.88 0.032 88)", glow: "oklch(0.96 0.016 92)", deep: "oklch(0.68 0.055 72)" },
  { base: "oklch(0.81 0.050 70)", glow: "oklch(0.93 0.028 80)", deep: "oklch(0.56 0.068 56)" },
  { base: "oklch(0.85 0.040 78)", glow: "oklch(0.95 0.018 86)", deep: "oklch(0.62 0.062 64)" },
]

/**
 * Ince tas greni — feTurbulence + saturate(0) ile gri gurultu. Renkli gurultu
 * multiply'da zemini lekeler, o yuzden doygunluk sifirlaniyor. Tamami data URI.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.7'/%3E%3C/svg%3E\")"

function hashOf(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function StoneTexture({ seed, initial }: { seed: string; initial: string }) {
  const hash = hashOf(seed)
  const preset = PRESETS[hash % PRESETS.length]
  // Leke merkezleri ve tabaka acisi slug'a bagli — her yazi farkli ama sabit
  const x1 = 18 + (hash % 40)
  const y1 = 20 + ((hash >> 3) % 35)
  const x2 = 55 + ((hash >> 6) % 35)
  const y2 = 55 + ((hash >> 9) % 30)
  const angle = 105 + ((hash >> 12) % 70)
  // Travertenin tortul tabakalari neredeyse yatay uzanir
  const bandAngle = 3 + ((hash >> 15) % 10)
  const bandStep = 26 + ((hash >> 18) % 16)

  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background: `
          repeating-linear-gradient(${bandAngle}deg,
            oklch(0.52 0.045 58 / 0) 0px,
            oklch(0.52 0.045 58 / 0.085) ${bandStep}px,
            oklch(0.52 0.045 58 / 0) ${bandStep * 2}px),
          radial-gradient(38% 30% at ${x1}% ${y1}%, ${preset.glow} 0%, transparent 68%),
          radial-gradient(42% 34% at ${x2}% ${y2}%, ${preset.deep} 0%, transparent 72%),
          linear-gradient(${angle}deg, ${preset.base} 0%, ${preset.glow} 42%, ${preset.deep} 100%)
        `,
      }}
    >
      {/* Taş greni — gri gürültü, multiply ile zemini hafifçe kumlandırır */}
      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <span
        className="font-display absolute inset-0 flex items-center justify-center text-[7rem] leading-none select-none sm:text-[9rem]"
        style={{ color: "oklch(0.38 0.035 60 / 0.16)" }}
      >
        {initial}
      </span>
    </div>
  )
}

export function BlogCover({
  src,
  title,
  seed,
  className,
  priority = false,
}: {
  src: string | null
  /** Yazi basligi — bas harfi fallback dokuda kullanilir. */
  title: string
  /** Genelde slug — dokuyu deterministik yapan tohum. */
  seed: string
  className?: string
  priority?: boolean
}) {
  const initial = (title.trim()[0] ?? "M").toLocaleUpperCase("tr-TR")

  return (
    <div className={cn("relative overflow-hidden bg-secondary", className)}>
      {src ? (
        /* Kapak gorselleri dis kaynakli (Unsplash vb.) — next/image remotePatterns
           gerektirmesin diye duz img kullaniliyor.
           alt="" bilincli: kapak dekoratif, basligi her kullanimda hemen
           yanindaki metin tasiyor — tekrar ekran okuyucuda gurultu olur. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
      ) : (
        <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
          <StoneTexture seed={seed} initial={initial} />
        </div>
      )}
    </div>
  )
}
