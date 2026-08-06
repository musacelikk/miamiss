/**
 * JSON-LD'yi <script> icine gomerken guvenli hale getirir.
 *
 * JSON.stringify "<" karakterini kacislamaz: icerikten gelen bir baslikta
 * "</script>" gecerse tarayici script'i orada kapatir ve geri kalanini HTML
 * olarak isler. Asagidaki kacislar JSON acisindan esdeger, HTML acisindan
 * zararsizdir. U+2028/2029 ise eski JS ayristiricilarinda satir sonu sayilir.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}
