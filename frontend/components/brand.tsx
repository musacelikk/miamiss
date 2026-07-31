import { cn } from "@/lib/utils"

/**
 * Marka yazisi: "miamisu" belirgin serif, "home" kucuk ve sonuk.
 * Renk ust elementten miras alinir (koyu/acik zeminde ayni kullanilir).
 */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-[0.35em] whitespace-nowrap leading-none", className)}>
      <span className="font-display font-semibold italic tracking-tight">miamisu</span>
      <span className="font-sans text-[0.42em] font-medium uppercase tracking-[0.4em] opacity-50">
        home
      </span>
    </span>
  )
}
