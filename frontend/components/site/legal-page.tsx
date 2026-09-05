import type React from "react"

export function LegalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="font-display text-4xl">{title}</h1>
      <div className="prose-sm mt-8 space-y-5 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_dl]:space-y-1 [&_dt]:font-semibold [&_dt]:text-foreground [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-foreground [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:leading-relaxed [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  )
}
