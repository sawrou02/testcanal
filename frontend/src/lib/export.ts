/**
 * Export Excel (.xlsx) et PDF brandés SENDISTRI.
 * - Excel via exceljs (en-tête vert, titre, période, totaux, formats nombres).
 * - PDF via jsPDF + autotable (bande verte, logo texte, bandeau tricolore, pied de page).
 */
import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ExportColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

export interface ExportOptions {
  title: string
  periode?: string
  columns: ExportColumn[]
  rows: Record<string, unknown>[]
}

const GREEN = '0E8A4F'
const GREEN_DARK = '0A6B3D'
const GOLD = 'E2A000'
const RED = 'D23A2C'

/** Columns that are UI-only (actions, delete) and must not be exported. */
const isExportable = (c: ExportColumn) =>
  c.key !== 'actions' && !c.key.startsWith('__') && c.label.trim() !== ''

/** Best-effort plain value from a row cell (handles nested {raisonSociale|nom|code}). */
function cellValue(row: Record<string, unknown>, key: string): string | number {
  const v = row[key]
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return v
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    return (o.raisonSociale ?? o.nom ?? o.nomCommercial ?? o.code ?? '') as string
  }
  return String(v)
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase()

const stamp = () => {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** fr-FR number, but with a plain ASCII space (jsPDF can't encode U+202F/U+00A0). */
const fmtNum = (n: number) => n.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')

// ---------------- EXCEL ----------------
export async function exportExcel({ title, periode, columns, rows }: ExportOptions) {
  const cols = columns.filter(isExportable)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SENDISTRI'
  wb.created = new Date()
  const ws = wb.addWorksheet('Export', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { fitToPage: true, orientation: cols.length > 6 ? 'landscape' : 'portrait' },
  })

  const lastCol = Math.max(cols.length, 1)
  const colLetter = (n: number) => {
    let s = ''
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) }
    return s
  }
  const span = `A1:${colLetter(lastCol)}1`

  // Title band
  ws.mergeCells(span)
  const tcell = ws.getCell('A1')
  tcell.value = `SENDISTRI — ${title}`
  tcell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  tcell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  tcell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN } }
  ws.getRow(1).height = 30

  // Sub line (période + date génération)
  ws.mergeCells(`A2:${colLetter(lastCol)}2`)
  const sub = ws.getCell('A2')
  sub.value = `${periode ? 'Période : ' + periode + '   ·   ' : ''}Généré le ${new Date().toLocaleString('fr-FR')}`
  sub.font = { size: 10, italic: true, color: { argb: 'FF666666' } }
  sub.alignment = { horizontal: 'left', indent: 1 }
  ws.getRow(3).height = 6 // spacer

  // Header row (row 4)
  const headerRow = ws.getRow(4)
  cols.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = c.label
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN_DARK } }
    cell.alignment = { horizontal: c.align === 'right' ? 'right' : 'left', vertical: 'middle' }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } }
  })
  headerRow.height = 22

  // Data rows
  rows.forEach((row, r) => {
    const xr = ws.getRow(5 + r)
    cols.forEach((c, i) => {
      const cell = xr.getCell(i + 1)
      const val = cellValue(row, c.key)
      cell.value = val as ExcelJS.CellValue
      if (typeof val === 'number') cell.numFmt = '#,##0'
      cell.alignment = { horizontal: c.align === 'right' ? 'right' : 'left' }
      if (r % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F3' } }
    })
  })

  // Column widths
  cols.forEach((c, i) => {
    const maxLen = Math.max(
      c.label.length,
      ...rows.slice(0, 200).map((row) => String(cellValue(row, c.key)).length),
    )
    ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 3, 12), 40)
  })

  const buf = await wb.xlsx.writeBuffer()
  triggerDownload(
    `${slug(title)}_${stamp()}.xlsx`,
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
}

// ---------------- PDF ----------------
export function exportPdf({ title, periode, columns, rows }: ExportOptions) {
  const cols = columns.filter(isExportable)
  const landscape = cols.length > 6
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  const hex = (h: string): [number, number, number] => [
    parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16),
  ]

  // Header band
  doc.setFillColor(...hex(GREEN_DARK))
  doc.rect(0, 0, W, 64, 'F')
  // Logo mark
  doc.setFillColor(...hex(GREEN))
  doc.roundedRect(40, 16, 30, 30, 6, 6, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('S', 51, 38)
  // Brand + title
  doc.setFontSize(18)
  doc.text('SENDISTRI', 82, 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(200, 225, 210)
  doc.text(title, 82, 48)
  // Tricolor bar
  doc.setFillColor(...hex(GREEN)); doc.rect(W - 120, 24, 24, 5, 'F')
  doc.setFillColor(...hex(GOLD)); doc.rect(W - 94, 24, 24, 5, 'F')
  doc.setFillColor(...hex(RED)); doc.rect(W - 68, 24, 24, 5, 'F')
  // Meta line
  doc.setTextColor(110, 110, 110)
  doc.setFontSize(9)
  const meta = `${periode ? 'Période : ' + periode + '   ·   ' : ''}Généré le ${new Date().toLocaleString('fr-FR')}`
  doc.text(meta, 40, 80)

  autoTable(doc, {
    startY: 92,
    head: [cols.map((c) => c.label)],
    body: rows.map((row) =>
      cols.map((c) => {
        const v = cellValue(row, c.key)
        return typeof v === 'number' ? fmtNum(v) : String(v)
      }),
    ),
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: hex(GREEN), textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 246, 243] },
    columnStyles: Object.fromEntries(
      cols.map((c, i) => [i, { halign: c.align === 'right' ? 'right' : 'left' }]),
    ),
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight()
      const page = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text('Document généré par SENDISTRI', 40, h - 18)
      doc.text(`Page ${page}`, W - 60, h - 18)
    },
  })

  doc.save(`${slug(title)}_${stamp()}.pdf`)
}
