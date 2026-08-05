"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Bold,
  Code,
  ExternalLink,
  Eye,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  Loader2,
  Pencil,
  Plus,
  Quote,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { api, type BlogPost } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { ImagePicker } from "@/components/admin/image-picker"
import { BlogContent, type BlogFormat } from "@/components/site/blog-content"
import { cn } from "@/lib/utils"

const EMPTY = {
  title: "",
  excerpt: "",
  content: "",
  format: "MARKDOWN" as BlogFormat,
  coverImage: null as string | null,
  isPublished: false,
}

type FormState = typeof EMPTY & { id?: string }

const FORMAT_INFO: Record<BlogFormat, { label: string; hint: string }> = {
  MARKDOWN: {
    label: "Markdown",
    hint: "Başlık için ## , kalın için **metin**, link için [yazı](url). Araç çubuğunu kullanabilirsin.",
  },
  HTML: {
    label: "HTML + CSS",
    hint: "Serbest HTML yazabilirsin; <style> etiketi ile özel CSS de ekleyebilirsin.",
  },
  TEXT: {
    label: "Düz Metin",
    hint: "Paragrafları boş satırla ayır — biçimlendirme uygulanmaz.",
  },
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const [uploadingInline, setUploadingInline] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const inlineFileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    api<BlogPost[]>("/admin/blog")
      .then(setPosts)
      .catch((e) => toast.error(e.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /** Secili metnin etrafina isaretleyici ekler (markdown/html araclari) */
  const wrapSelection = (before: string, after = "", placeholder = "") => {
    const ta = contentRef.current
    if (!ta || !form) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = form.content.slice(start, end) || placeholder
    const next =
      form.content.slice(0, start) + before + selected + after + form.content.slice(end)
    setForm({ ...form, content: next })
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  const insertAtCursor = (text: string) => {
    const ta = contentRef.current
    if (!ta || !form) return
    const start = ta.selectionStart
    const next = form.content.slice(0, start) + text + form.content.slice(ta.selectionEnd)
    setForm({ ...form, content: next })
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + text.length, start + text.length)
    })
  }

  /** Icerige gorsel yukle: yukleyip formatina uygun sekilde imleci konuma ekler */
  const uploadInlineImage = async (files: FileList | null) => {
    if (!files?.length || !form) return
    setUploadingInline(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f) => fd.append("files", f))
      const res = await api<{ urls: string[] }>("/admin/uploads", { method: "POST", body: fd })
      const snippets = res.urls.map((url) =>
        form.format === "HTML"
          ? `\n<img src="${url}" alt="" />\n`
          : `\n\n![görsel](${url})\n\n`,
      )
      insertAtCursor(snippets.join(""))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yükleme başarısız")
    } finally {
      setUploadingInline(false)
      if (inlineFileRef.current) inlineFileRef.current.value = ""
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setBusy(true)
    try {
      const payload = {
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        format: form.format,
        coverImage: form.coverImage,
        isPublished: form.isPublished,
      }
      if (form.id) {
        await api(`/admin/blog/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        toast.success("Yazı güncellendi")
      } else {
        await api("/admin/blog", { method: "POST", body: JSON.stringify(payload) })
        toast.success("Yazı eklendi")
      }
      setForm(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (p: BlogPost) => {
    if (!confirm(`"${p.title}" yazısı silinsin mi?`)) return
    try {
      await api(`/admin/blog/${p.id}`, { method: "DELETE" })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi")
    }
  }

  const input =
    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"

  const toolBtn =
    "flex h-8 w-8 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:border-accent hover:text-accent"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Blog sayfasına sadece footer'dan ulaşılır:{" "}
          <a href="/blog" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            /blog <ExternalLink className="mb-0.5 inline h-3 w-3" />
          </a>
        </p>
        <button
          onClick={() => {
            setPreview(false)
            setForm({ ...EMPTY })
          }}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> Yeni Yazı
        </button>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 pt-8">
          <form
            onSubmit={save}
            className="w-full max-w-4xl rounded-lg border border-border bg-background p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{form.id ? "Yazıyı Düzenle" : "Yeni Yazı"}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="w-40 shrink-0">
                  <label className="mb-1.5 block text-xs font-semibold">Kapak Görseli</label>
                  <ImagePicker
                    value={form.coverImage}
                    onChange={(url) => setForm({ ...form, coverImage: url })}
                    aspect="aspect-[4/3]"
                  />
                </div>
                <div className="min-w-64 flex-1 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">Başlık *</label>
                    <input
                      required
                      minLength={3}
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className={input}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">
                      Özet (listede görünür)
                    </label>
                    <textarea
                      rows={3}
                      value={form.excerpt}
                      onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                      className={input}
                    />
                  </div>
                </div>
              </div>

              {/* Format seçimi */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold">İçerik Formatı</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FORMAT_INFO) as BlogFormat[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm({ ...form, format: f })}
                      className={cn(
                        "rounded-md border px-4 py-2 text-xs font-semibold transition-colors",
                        form.format === f
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-background text-muted-foreground hover:border-accent hover:text-accent",
                      )}
                    >
                      {FORMAT_INFO[f].label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {FORMAT_INFO[form.format].hint}
                </p>
              </div>

              {/* İçerik + araç çubuğu + önizleme */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-semibold">İçerik</label>
                  <button
                    type="button"
                    onClick={() => setPreview((p) => !p)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-semibold",
                      preview
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:border-accent hover:text-accent",
                    )}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {preview ? "Düzenlemeye Dön" : "Önizleme"}
                  </button>
                </div>

                {!preview && form.format !== "TEXT" && (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {form.format === "MARKDOWN" ? (
                      <>
                        <button type="button" className={toolBtn} title="Kalın" onClick={() => wrapSelection("**", "**", "kalın metin")}>
                          <Bold className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className={toolBtn} title="İtalik" onClick={() => wrapSelection("_", "_", "italik metin")}>
                          <Italic className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className={toolBtn} title="Başlık" onClick={() => wrapSelection("\n## ", "\n", "Başlık")}>
                          <Heading2 className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className={toolBtn} title="Alt Başlık" onClick={() => wrapSelection("\n### ", "\n", "Alt başlık")}>
                          <Heading3 className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className={toolBtn} title="Link" onClick={() => wrapSelection("[", "](https://)", "bağlantı yazısı")}>
                          <Link2 className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className={toolBtn} title="Liste" onClick={() => wrapSelection("\n- ", "", "madde")}>
                          <List className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className={toolBtn} title="Alıntı" onClick={() => wrapSelection("\n> ", "\n", "alıntı")}>
                          <Quote className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className={toolBtn} title="Kod" onClick={() => wrapSelection("`", "`", "kod")}>
                          <Code className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className={toolBtn} title="Kalın" onClick={() => wrapSelection("<strong>", "</strong>", "kalın")}>
                          <Bold className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className={toolBtn} title="Başlık" onClick={() => wrapSelection("\n<h2>", "</h2>\n", "Başlık")}>
                          <Heading2 className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className={toolBtn} title="Paragraf" onClick={() => wrapSelection("\n<p>", "</p>\n", "paragraf")}>
                          <Quote className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className={toolBtn} title="Link" onClick={() => wrapSelection('<a href="https://">', "</a>", "bağlantı")}>
                          <Link2 className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className={toolBtn} title="CSS bloğu" onClick={() => insertAtCursor("\n<style>\n  .ozel-sinif { color: #b08d57; }\n</style>\n")}>
                          <Code className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => inlineFileRef.current?.click()}
                      disabled={uploadingInline}
                      className="flex h-8 items-center gap-1.5 rounded border border-border bg-background px-2.5 text-[11px] font-semibold text-muted-foreground hover:border-accent hover:text-accent disabled:opacity-50"
                      title="İçeriğe görsel ekle"
                    >
                      {uploadingInline ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5" />
                      )}
                      Görsel Ekle
                    </button>
                    <input
                      ref={inlineFileRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      onChange={(e) => void uploadInlineImage(e.target.files)}
                    />
                  </div>
                )}

                {preview ? (
                  <div className="max-h-[28rem] min-h-64 overflow-y-auto rounded-md border border-border bg-card p-6">
                    {form.content.trim() ? (
                      <BlogContent content={form.content} format={form.format} />
                    ) : (
                      <p className="text-sm text-muted-foreground">İçerik boş.</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    ref={contentRef}
                    rows={16}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className={cn(input, "font-mono text-xs leading-relaxed")}
                    placeholder={
                      form.format === "MARKDOWN"
                        ? "## Başlık\n\nParagraf metni... **kalın**, _italik_, [link](https://)..."
                        : form.format === "HTML"
                          ? "<style>\n  .vurgu { color: #b08d57; }\n</style>\n<h2>Başlık</h2>\n<p>Paragraf <span class=\"vurgu\">metni</span>...</p>"
                          : "Paragrafları boş satırla ayırın..."
                    }
                  />
                )}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
                Yayında
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="h-10 rounded-md border border-border px-6 text-xs font-semibold"
              >
                Vazgeç
              </button>
              <button
                disabled={busy}
                className="flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-xs font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="divide-y divide-border rounded-md border border-border bg-card">
        {posts === null ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
          </div>
        ) : posts.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Henüz yazı yok.</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4">
              {p.coverImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.coverImage} alt="" className="h-14 w-20 rounded-md object-cover" />
              ) : (
                <div className="h-14 w-20 rounded-md bg-secondary" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /blog/{p.slug} · {formatDate(p.createdAt)} ·{" "}
                  {FORMAT_INFO[(p.format ?? "TEXT") as BlogFormat]?.label ?? p.format}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  p.isPublished
                    ? "bg-green-100 text-green-800"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {p.isPublished ? "Yayında" : "Taslak"}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => {
                    setPreview(false)
                    setForm({
                      id: p.id,
                      title: p.title,
                      excerpt: p.excerpt ?? "",
                      content: p.content ?? "",
                      format: (p.format ?? "TEXT") as BlogFormat,
                      coverImage: p.coverImage,
                      isPublished: p.isPublished,
                    })
                  }}
                  className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-accent"
                  aria-label="Düzenle"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void remove(p)}
                  className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
