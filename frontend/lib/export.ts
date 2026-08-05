/**
 * Logolu PDF ve Excel dışa aktarma yardımcıları (yalnızca admin panelinde,
 * dinamik import ile yüklenir — site paketini şişirmez).
 */

export interface ExportColumn {
  key: string
  label: string
  /** Sağa hizalanacak sayısal kolon */
  numeric?: boolean
}

export type ExportRow = Record<string, string | number | null | undefined>

const BRAND = {
  dark: "#2e2925",
  accent: "#a5875c",
  light: "#f7f4ee",
  border: "#e6dfd2",
}

/** /logo/logo.png dosyasını dataURL'e çevirir (PDF ve Excel'e gömmek için) */
async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch("/logo/logo.png")
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function cellText(v: string | number | null | undefined): string {
  if (v == null) return "—"
  return String(v)
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export async function exportPdf(opts: {
  title: string
  subtitle?: string
  columns: ExportColumn[]
  rows: ExportRow[]
  fileName: string
}) {
  const [pdfMakeModule, vfsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ])
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const pdfMake: any = (pdfMakeModule as any).default ?? pdfMakeModule
  const vfs: any = (vfsModule as any).default ?? vfsModule
  if (typeof pdfMake.addVirtualFileSystem === "function") pdfMake.addVirtualFileSystem(vfs)
  else pdfMake.vfs = vfs

  const logo = await loadLogo()
  const generatedAt = new Date().toLocaleString("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  })

  const headerRow = opts.columns.map((c) => ({
    text: c.label,
    style: "tableHeader",
    alignment: c.numeric ? "right" : "left",
  }))
  const bodyRows = opts.rows.map((row, i) =>
    opts.columns.map((c) => ({
      text: cellText(row[c.key]),
      style: "tableCell",
      alignment: c.numeric ? "right" : "left",
      fillColor: i % 2 === 1 ? BRAND.light : undefined,
    })),
  )

  const landscape = opts.columns.length > 5

  const doc: any = {
    pageSize: "A4",
    pageOrientation: landscape ? "landscape" : "portrait",
    pageMargins: [36, 96, 36, 48],
    header: {
      margin: [36, 24, 36, 0],
      columns: [
        logo
          ? { image: logo, fit: [110, 44] }
          : { text: "Miamisu Home", style: "brand" },
        {
          stack: [
            { text: opts.title, style: "title", alignment: "right" },
            {
              text: opts.subtitle ? `${opts.subtitle} · ${generatedAt}` : generatedAt,
              style: "meta",
              alignment: "right",
            },
          ],
        },
      ],
    },
    footer: (currentPage: number, pageCount: number) => ({
      margin: [36, 12, 36, 0],
      columns: [
        { text: "Miamisu Home — www.miamisuhome.com", style: "meta" },
        { text: `Sayfa ${currentPage} / ${pageCount}`, style: "meta", alignment: "right" },
      ],
    }),
    content: [
      opts.rows.length === 0
        ? { text: "Bu ölçütlerle kayıt bulunamadı.", style: "tableCell", margin: [0, 12, 0, 0] }
        : {
            table: {
              headerRows: 1,
              widths: opts.columns.map(() => "auto"),
              body: [headerRow, ...bodyRows],
            },
            layout: {
              hLineWidth: (i: number) => (i <= 1 ? 1 : 0.5),
              vLineWidth: () => 0,
              hLineColor: () => BRAND.border,
              paddingTop: () => 6,
              paddingBottom: () => 6,
              paddingLeft: () => 8,
              paddingRight: () => 8,
            },
          },
      {
        text: `Toplam ${opts.rows.length} kayıt`,
        style: "meta",
        margin: [0, 10, 0, 0],
      },
    ],
    styles: {
      brand: { fontSize: 16, bold: true, color: BRAND.dark },
      title: { fontSize: 15, bold: true, color: BRAND.dark },
      meta: { fontSize: 8, color: "#9b9184" },
      tableHeader: { fontSize: 9, bold: true, color: "#ffffff", fillColor: BRAND.dark },
      tableCell: { fontSize: 8.5, color: BRAND.dark },
    },
    defaultStyle: { font: "Roboto" },
  }

  pdfMake.createPdf(doc).download(opts.fileName)
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export async function exportExcel(opts: {
  title: string
  subtitle?: string
  columns: ExportColumn[]
  rows: ExportRow[]
  fileName: string
}) {
  const ExcelJS = (await import("exceljs")).default ?? (await import("exceljs"))
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Miamisu Home"
  workbook.created = new Date()
  const sheet = workbook.addWorksheet(opts.title.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 5 }],
  })

  // Logo (satır 1-3 arasına)
  const logo = await loadLogo()
  if (logo) {
    const imageId = workbook.addImage({ base64: logo, extension: "png" })
    sheet.addImage(imageId, { tl: { col: 0.2, row: 0.2 }, ext: { width: 150, height: 60 } })
  }

  // Başlık bloğu
  const colCount = Math.max(opts.columns.length, 3)
  sheet.mergeCells(1, 1, 1, colCount)
  sheet.mergeCells(2, 1, 2, colCount)
  const titleCell = sheet.getCell(2, 2)
  sheet.getCell(1, 1).value = ""
  sheet.getRow(1).height = 26
  sheet.getRow(2).height = 26
  titleCell.value = opts.title
  const subtitle = `${opts.subtitle ? `${opts.subtitle} · ` : ""}${new Date().toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" })}`
  sheet.mergeCells(3, 1, 3, colCount)
  sheet.getCell(3, 2).value = subtitle
  sheet.getCell(3, 2).font = { size: 9, color: { argb: "FF9B9184" } }
  sheet.getCell(2, 2).font = { size: 14, bold: true, color: { argb: "FF2E2925" } }
  sheet.getCell(2, 2).alignment = { horizontal: "center" }
  sheet.getCell(3, 2).alignment = { horizontal: "center" }
  sheet.getRow(4).height = 6

  // Kolon başlıkları (5. satır)
  const headerRow = sheet.getRow(5)
  opts.columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = c.label
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E2925" } }
    cell.alignment = { horizontal: c.numeric ? "right" : "left", vertical: "middle" }
    cell.border = { bottom: { style: "thin", color: { argb: "FFE6DFD2" } } }
  })
  headerRow.height = 20

  // Veri satırları
  opts.rows.forEach((row, ri) => {
    const r = sheet.getRow(6 + ri)
    opts.columns.forEach((c, ci) => {
      const cell = r.getCell(ci + 1)
      const v = row[c.key]
      cell.value = v == null ? "—" : (v as string | number)
      cell.font = { size: 9.5, color: { argb: "FF2E2925" } }
      cell.alignment = { horizontal: c.numeric ? "right" : "left" }
      if (ri % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F4EE" } }
      }
      cell.border = { bottom: { style: "hair", color: { argb: "FFE6DFD2" } } }
    })
  })

  // Kolon genişlikleri: içeriğe göre kaba tahmin
  opts.columns.forEach((c, i) => {
    const maxLen = Math.max(
      c.label.length,
      ...opts.rows.slice(0, 200).map((r) => cellText(r[c.key]).length),
    )
    sheet.getColumn(i + 1).width = Math.min(48, Math.max(10, maxLen + 3))
  })

  const buffer = await workbook.xlsx.writeBuffer()
  triggerDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    opts.fileName,
  )
}
