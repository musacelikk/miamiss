"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { api, imageUrl } from "@/lib/api"
import { cn } from "@/lib/utils"

/** Tek gorsel secici: mevcut gorseli gosterir, tiklayinca /admin/uploads'a yukler. */
export function ImagePicker({
  value,
  onChange,
  className,
  aspect = "aspect-square",
  replaceOnly = false,
}: {
  value: string | null
  onChange: (url: string | null) => void
  className?: string
  aspect?: string
  /** true: gorsel silinemez, yalnizca yenisiyle degistirilebilir */
  replaceOnly?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append("files", files[0])
      const res = await api<{ urls: string[] }>("/admin/uploads", { method: "POST", body: fd })
      onChange(res.urls[0])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yükleme başarısız")
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className={cn("group relative overflow-hidden rounded-md border border-border", className)}>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className={cn("block w-full bg-muted", aspect)}
      >
        {value ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={imageUrl(value)} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px] font-medium">Görsel Seç</span>
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </span>
        )}
      </button>
      {value && !busy && !replaceOnly && (
        <span className="absolute right-1.5 top-1.5 hidden gap-1 group-hover:flex">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            aria-label="Görseli kaldır"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
      {value && !busy && replaceOnly && (
        <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 hidden rounded bg-foreground/80 py-1 text-center text-[10px] font-bold text-background backdrop-blur group-hover:block">
          Değiştir
        </span>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => void upload(e.target.files)}
      />
    </div>
  )
}
