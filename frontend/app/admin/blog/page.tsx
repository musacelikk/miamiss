"use client"

import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { api, type BlogPost } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { ImagePicker } from "@/components/admin/image-picker"
import { cn } from "@/lib/utils"

const EMPTY = {
  title: "",
  excerpt: "",
  content: "",
  coverImage: null as string | null,
  isPublished: false,
}

type FormState = typeof EMPTY & { id?: string }

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api<BlogPost[]>("/admin/blog")
      .then(setPosts)
      .catch((e) => toast.error(e.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setBusy(true)
    try {
      const payload = {
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
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
          onClick={() => setForm({ ...EMPTY })}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> Yeni Yazı
        </button>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 pt-10">
          <form
            onSubmit={save}
            className="w-full max-w-2xl rounded-lg border border-border bg-background p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{form.id ? "Yazıyı Düzenle" : "Yeni Yazı"}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div className="flex gap-4">
                <div className="w-40 shrink-0">
                  <label className="mb-1.5 block text-xs font-semibold">Kapak Görseli</label>
                  <ImagePicker
                    value={form.coverImage}
                    onChange={(url) => setForm({ ...form, coverImage: url })}
                    aspect="aspect-[4/3]"
                  />
                </div>
                <div className="flex-1 space-y-4">
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
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  İçerik (paragrafları boş satırla ayırın)
                </label>
                <textarea
                  rows={12}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className={cn(input, "font-mono text-xs leading-relaxed")}
                />
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
                  /blog/{p.slug} · {formatDate(p.createdAt)}
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
                  onClick={() =>
                    setForm({
                      id: p.id,
                      title: p.title,
                      excerpt: p.excerpt ?? "",
                      content: p.content ?? "",
                      coverImage: p.coverImage,
                      isPublished: p.isPublished,
                    })
                  }
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
