import { productDisplay, type Product, type ProductLabelTone } from "@/lib/api"
import { cn } from "@/lib/utils"

const TONE: Record<ProductLabelTone, string> = {
  DARK: "bg-foreground/80 text-background",
  ACCENT: "bg-accent text-accent-foreground",
  MUTED: "bg-background/90 text-foreground shadow-sm",
  WARM: "bg-primary text-primary-foreground",
}

export function labelToneClass(tone: ProductLabelTone | string) {
  return TONE[tone as ProductLabelTone] ?? TONE.DARK
}

const BASE =
  "rounded-sm px-2 py-1 font-bold uppercase tracking-wider"

export function ProductBadges({
  product,
  className,
  compact = true,
}: {
  product: Product
  className?: string
  compact?: boolean
}) {
  const { minPrice, compareAtPrice, stock } = productDisplay(product)
  const outOfStock = stock <= 0
  const discount =
    compareAtPrice && compareAtPrice > minPrice
      ? Math.round((1 - minPrice / compareAtPrice) * 100)
      : null
  const custom = outOfStock ? [] : (product.labels ?? [])
  if (!outOfStock && discount == null && custom.length === 0) return null

  const size = compact ? "text-[10px]" : "text-xs"

  return (
    <div className={cn("absolute left-3 top-3 z-[1] flex flex-col items-start gap-1.5", className)}>
      {discount != null && (
        <span className={cn(BASE, size, TONE.ACCENT)}>%{discount} indirim</span>
      )}
      {outOfStock && (
        <span className={cn(BASE, size, TONE.DARK)}>Tükendi</span>
      )}
      {custom.map((label) => (
        <span key={label.id} className={cn(BASE, size, labelToneClass(label.tone))}>
          {label.name}
        </span>
      ))}
    </div>
  )
}
