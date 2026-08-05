export function formatPrice(value: number): string {
  return (
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value) + " ₺"
  )
}

/**
 * Türkçe formatlı ondalık girişleri sayıya çevirir: "19,90" → 19.9, "1.234,56" → 1234.56.
 * Boş veya geçersiz girişte NaN döner.
 */
export function parseDecimal(value: string): number {
  const s = value.trim()
  if (!s) return NaN
  const normalized = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : s
  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value))
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
