import * as XLSX from 'xlsx'

export type ExcelCell = string | number | boolean | Date | null | undefined

type ExportExcelParams = {
  fileName: string
  sheetName?: string
  header: string[]
  rows: ExcelCell[][]
  /**
   * Lebar kolom (approx) dalam satuan karakter.
   * Jika tidak diisi, akan dihitung otomatis sederhana berdasarkan isi sel.
   */
  columnWidths?: number[]
}

function sanitizeSheetName(name: string) {
  // Excel: max 31 chars, tidak boleh mengandung: : \ / ? * [ ]
  const cleaned = name.replace(/[:\\/?*\[\]]/g, ' ').trim()
  return (cleaned || 'Sheet1').slice(0, 31)
}

function ensureXlsx(fileName: string) {
  return fileName.toLowerCase().endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
}

function estimateWidths(aoa: ExcelCell[][]) {
  const maxCols = Math.max(0, ...aoa.map((r) => r.length))
  const widths = new Array<number>(maxCols).fill(10)
  for (const row of aoa) {
    for (let c = 0; c < maxCols; c++) {
      const raw = row[c]
      const text =
        raw === null || raw === undefined
          ? ''
          : raw instanceof Date
            ? raw.toISOString().slice(0, 10)
            : String(raw)
      // Batasi agar tidak kebesaran (Excel tetap bisa wrap)
      const w = Math.min(45, Math.max(8, text.length + 2))
      widths[c] = Math.max(widths[c], w)
    }
  }
  return widths
}

/**
 * Export data ke Excel (.xlsx) dan langsung trigger download di browser.
 * Kompatibel untuk Vite + React + Vercel (client-side).
 */
export function exportToExcel(params: ExportExcelParams) {
  const fileName = ensureXlsx(params.fileName)
  const sheetName = sanitizeSheetName(params.sheetName ?? 'Sheet1')

  const aoa: ExcelCell[][] = [params.header, ...params.rows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  const widths = params.columnWidths ?? estimateWidths(aoa)
  ws['!cols'] = widths.map((wch) => ({ wch }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Akan memicu download file di browser
  XLSX.writeFile(wb, fileName)
}

