"use client"

import { useRef, useState } from "react"
import { Film, Loader2, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { API_URL, getToken } from "@/lib/api"
import { cn } from "@/lib/utils"

const MAX_MB = 100

/**
 * Video secici: dosyayi /admin/uploads/video ucuna yukler (S3/CloudFront),
 * donen kalici URL'i kaydeder. Manuel URL girisi de destekler.
 */
export function VideoPicker({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (url: string) => void
  className?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)

  const upload = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Video en fazla ${MAX_MB} MB olabilir (seçilen: ${(file.size / 1024 / 1024).toFixed(1)} MB)`)
      if (fileRef.current) fileRef.current.value = ""
      return
    }
    setBusy(true)
    setProgress(0)

    // Yukleme ilerlemesini gosterebilmek icin fetch yerine XHR
    const fd = new FormData()
    fd.append("file", file)
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${API_URL}/admin/uploads/video`)
    const token = getToken()
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText) as { url: string }
          onChange(res.url)
          toast.success("Video yüklendi")
        } catch {
          toast.error("Sunucu yanıtı okunamadı")
        }
      } else {
        let message = "Yükleme başarısız"
        try {
          const data = JSON.parse(xhr.responseText) as { message?: string | string[] }
          if (data.message) message = Array.isArray(data.message) ? data.message[0] : data.message
        } catch {
          /* varsayılan mesaj */
        }
        toast.error(message)
      }
    }
    xhr.onerror = () => {
      setBusy(false)
      toast.error("Yükleme sırasında bağlantı hatası")
    }
    xhr.send(fd)
  }

  return (
    <div className={cn("space-y-2", className)}>
      {value ? (
        <div className="overflow-hidden rounded-md border border-border bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={value} controls muted playsInline className="aspect-video w-full" />
        </div>
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-border bg-muted text-muted-foreground">
          <Film className="h-6 w-6" />
          <span className="text-[11px] font-medium">Henüz video yok</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-accent disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {busy ? `Yükleniyor %${progress}` : value ? "Videoyu Değiştir" : "Video Yükle"}
        </button>
        {value && !busy && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex h-9 items-center gap-1.5 rounded-md border border-destructive/40 px-3 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" /> Kaldır
          </button>
        )}
      </div>

      {busy && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="veya video adresini yapıştırın (https://...)"
        className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[11px] outline-none focus:border-accent"
      />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Video S3/CloudFront'a yüklenir ve kalıcı adresten servis edilir. Önerilen: MP4 (H.264),
        1080p, 10-20 MB — dosya küçüldükçe anasayfa daha hızlı açılır. En fazla {MAX_MB} MB.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />
    </div>
  )
}
