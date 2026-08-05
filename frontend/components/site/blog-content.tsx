"use client"

import { useMemo } from "react"
import { marked } from "marked"

export type BlogFormat = "TEXT" | "MARKDOWN" | "HTML"

/**
 * Blog içeriğini formatına göre çizer:
 * - TEXT: boş satırla ayrılan paragraflar
 * - MARKDOWN: markdown → HTML (marked)
 * - HTML: olduğu gibi (admin tarafından yazılan HTML/CSS; <style> destekler)
 */
export function BlogContent({
  content,
  format = "TEXT",
}: {
  content: string
  format?: BlogFormat
}) {
  const html = useMemo(() => {
    if (format === "MARKDOWN") {
      return marked.parse(content, { async: false, breaks: true }) as string
    }
    if (format === "HTML") return content
    return null
  }, [content, format])

  if (html == null) {
    return (
      <div className="blog-content">
        {content
          .split(/\n\s*\n/)
          .filter((p) => p.trim())
          .map((paragraph, i) => (
            <p key={i}>{paragraph.trim()}</p>
          ))}
      </div>
    )
  }

  return <div className="blog-content" dangerouslySetInnerHTML={{ __html: html }} />
}
