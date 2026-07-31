/** Form alanlari icin ortak temizleme/dogrulama yardimcilari. */

/** Sadece rakam birakir, istege bagli uzunluk siniri uygular. */
export function onlyDigits(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, "")
  return maxLength ? digits.slice(0, maxLength) : digits
}

/** Turk telefon girisi: rakam disini atar, 11 hane (05xx xxx xx xx) ile sinirlar. */
export function sanitizePhone(value: string): string {
  return onlyDigits(value, 11)
}

/** Telefon gecerli mi: 10-11 hane (basinda 0 olsun olmasin kabul). */
export function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value)
  return digits.length === 11 ? digits.startsWith("0") : digits.length === 10
}

/** Posta kodu: en fazla 5 rakam. */
export function sanitizeZip(value: string): string {
  return onlyDigits(value, 5)
}

/** Isim alanlari: rakam ve ozel isaretleri atar (harf, bosluk, tire, kesme kalir). */
export function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜâÂîÎûÛ\s'-]/g, "").replace(/\s{2,}/g, " ")
}

/** TC kimlik no: 11 rakam. */
export function sanitizeTckn(value: string): string {
  return onlyDigits(value, 11)
}

/** Vergi no: 10 rakam. */
export function sanitizeTaxNo(value: string): string {
  return onlyDigits(value, 10)
}

/** Telefon input'lari icin ortak HTML ozellikleri. */
export const phoneInputProps = {
  type: "tel" as const,
  inputMode: "numeric" as const,
  autoComplete: "tel" as const,
  placeholder: "05xx xxx xx xx",
  maxLength: 11,
}
