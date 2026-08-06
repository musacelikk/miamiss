import sanitizeHtml from "sanitize-html"

/**
 * BlogProduce'tan gelen HTML govde icin yardimcilar.
 *
 * Neden sanitize ediyoruz: API'nin `content_html` alani sunucuda
 * markdown→HTML cevriminden geciyor ama sanitizasyondan GECMIYOR. Bu HTML'i
 * dangerouslySetInnerHTML ile bastigimiz icin temizligi burada yapiyoruz.
 *
 * Not: admin panelinden yazilan yerel bloglar bu yoldan gecmez — onlar
 * bilerek <style> destekleyen guvenilir icerik olarak kalir.
 */

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "mark", "small", "sub", "sup",
    "ul", "ol", "li",
    "blockquote", "figure", "figcaption",
    "a", "img",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    "pre", "code", "span", "div",
  ],
  allowedAttributes: {
    // Basliklardaki id'ler icindekiler (TOC) baglantilari icin gerekli
    h1: ["id"], h2: ["id"], h3: ["id"], h4: ["id"], h5: ["id"], h6: ["id"],
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    code: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  // Izin verilmeyen etiketlerin metni kalsin, sadece etiket dusesin;
  // script/style'da ise icerik de tamamen silinsin.
  nonTextTags: ["script", "style", "textarea", "noscript", "option"],
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? ""
      const external = /^https?:\/\//i.test(href)
      return {
        tagName,
        attribs: external
          ? { ...attribs, rel: "noopener noreferrer nofollow", target: "_blank" }
          : attribs,
      }
    },
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: "lazy" },
    }),
  },
}

export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}

/**
 * Govdedeki ilk <h1>'i atar. BlogProduce icerigi yazi basligini h1 olarak
 * tekrar ediyor; sayfada basligi biz cizdigimiz icin ikinci bir h1 hem
 * gorsel tekrar hem de SEO acisindan sorun olurdu.
 */
export function stripLeadingH1(html: string): string {
  return html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, "")
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&nbsp;": " ",
}

/** HTML'den duz metin — okuma suresi ve meta aciklama icin. */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Ortalama 200 kelime/dk. En az 1 dk doner. */
export function readingMinutes(html: string): number {
  const words = htmlToText(html).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export interface TocEntry {
  id: string
  text: string
  level: 2 | 3
}

/** Govdedeki h2/h3 basliklarindan icindekiler listesi cikarir. */
export function extractToc(html: string): TocEntry[] {
  const entries: TocEntry[] = []
  const pattern = /<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi

  for (const match of html.matchAll(pattern)) {
    const text = htmlToText(match[3])
    if (!text) continue
    entries.push({
      id: match[2],
      text,
      level: match[1] === "2" ? 2 : 3,
    })
  }

  return entries
}

export interface FaqEntry {
  question: string
  answer: string
}

const FAQ_HEADING = /sık(ç|c)a\s+sorulan|sikca\s+sorulan|\bsss\b|frequently\s+asked|\bfaq\b/i

/**
 * Yazi sonundaki SSS bolumunu ayristirir — Google'in FAQ zengin sonuclari icin
 * JSON-LD uretmekte kullanilir. Yapi beklenenden farkliysa bos dizi doner.
 */
export function extractFaq(html: string): FaqEntry[] {
  const headings = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
  const faqHeading = headings.find((h) => FAQ_HEADING.test(htmlToText(h[1])))
  if (!faqHeading || faqHeading.index === undefined) return []

  // SSS basligindan sonraki bolum — varsa bir sonraki h2'ye kadar
  const after = html.slice(faqHeading.index + faqHeading[0].length)
  const nextHeading = after.search(/<h2\b/i)
  const section = nextHeading === -1 ? after : after.slice(0, nextHeading)

  const entries: FaqEntry[] = []
  for (const match of section.matchAll(
    /<p\b[^>]*>\s*<strong\b[^>]*>([\s\S]*?)<\/strong>([\s\S]*?)<\/p>/gi,
  )) {
    const question = htmlToText(match[1]).replace(/\s*[:?]\s*$/, "?")
    const answer = htmlToText(match[2])
    if (question && answer) entries.push({ question, answer })
  }

  return entries
}
