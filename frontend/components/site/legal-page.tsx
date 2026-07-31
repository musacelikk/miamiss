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
      <div className="prose-sm mt-8 space-y-5 text-sm leading-relaxed text-muted-foreground [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-foreground [&_strong]:text-foreground">
        {children}
      </div>
    </div>
  )
}
