import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Marka logosu (public/logo/logo.png — seffaf zeminde siyah cizim).
 * Koyu zeminlerde `dark` ile beyaza cevrilir. Boyut className ile (h-10 gibi).
 */
export function Logo({
  dark = false,
  className,
}: {
  dark?: boolean
  className?: string
}) {
  return (
    <Image
      src="/logo/logo.png"
      alt="Miamisu Home"
      width={416}
      height={380}
      priority
      className={cn("w-auto select-none", dark && "invert", className)}
    />
  )
}
