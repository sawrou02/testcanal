import { useState } from 'react'
import { Icon } from './Icon'
import { useToast } from './Toast'
import { exportExcel, exportPdf, type ExportColumn } from '../../lib/export'

interface Props {
  title: string
  periode?: string
  columns: ExportColumn[]
  rows: Record<string, unknown>[]
}

/** Two small buttons (Excel + PDF) producing branded SENDISTRI documents. */
export function ExportButtons({ title, periode, columns, rows }: Props) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const run = async (kind: 'excel' | 'pdf') => {
    if (!rows.length) {
      toast.info('Rien à exporter')
      return
    }
    setBusy(true)
    try {
      if (kind === 'excel') await exportExcel({ title, periode, columns, rows })
      else exportPdf({ title, periode, columns, rows })
    } catch {
      toast.error("Échec de l'export")
    } finally {
      setBusy(false)
    }
  }

  const btn =
    'inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-2 rounded-lg border transition-colors disabled:opacity-50'

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => run('excel')}
        disabled={busy}
        title="Exporter en Excel"
        className={btn}
        style={{ borderColor: 'var(--border)', color: 'var(--primary-dark)' }}
      >
        <Icon name="download" size={15} /> Excel
      </button>
      <button
        type="button"
        onClick={() => run('pdf')}
        disabled={busy}
        title="Exporter en PDF"
        className={btn}
        style={{ borderColor: 'var(--border)', color: 'var(--danger)' }}
      >
        <Icon name="download" size={15} /> PDF
      </button>
    </div>
  )
}
