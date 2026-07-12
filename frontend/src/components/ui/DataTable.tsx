import { useState, useMemo } from 'react'
import { cn } from '../../lib/utils'
import { t } from '../../lib/locale'
import { ExportButtons } from './ExportButtons'

interface Column<T> {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: T) => React.ReactNode
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  rows: T[]
  pageSize?: number
  pageSizeOptions?: number[]
  searchable?: boolean
  selectable?: boolean
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyMessage?: string
  totalsRow?: Partial<T>
  exportable?: boolean
  exportTitle?: string
  exportPeriode?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  searchable = true,
  selectable = false,
  onRowClick,
  loading = false,
  emptyMessage = 'Aucune donnée disponible',
  totalsRow,
  exportable = true,
  exportTitle = 'Export SENDISTRI',
  exportPeriode,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col.key]
        return String(val ?? '').toLowerCase().includes(q)
      }),
    )
  }, [rows, search, columns])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const toggleAll = () => {
    if (selected.size === paginated.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(paginated.map((_, i) => (page - 1) * pageSize + i)))
    }
  }

  const toggleRow = (idx: number) => {
    const newSet = new Set(selected)
    if (newSet.has(idx)) newSet.delete(idx)
    else newSet.add(idx)
    setSelected(newSet)
  }

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        {searchable && (
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder={t('Rechercher...')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 pr-3 py-2 text-sm border border-app-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
        <div className="flex items-center gap-3 text-sm text-app-muted ml-auto">
          {exportable && (
            <ExportButtons
              title={exportTitle}
              periode={exportPeriode}
              columns={columns.map((c) => ({ key: c.key, label: c.label, align: c.align }))}
              rows={filtered as Record<string, unknown>[]}
            />
          )}
          <div className="flex items-center gap-2">
            <span>{t('Lignes par page:')}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="border border-app-border rounded px-2 py-1 bg-white text-app-text"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-app-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-app-border">
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === paginated.length && paginated.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 font-semibold text-app-muted uppercase tracking-wider text-xs whitespace-nowrap',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  )}
                >
                  {t(col.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="text-center py-12 text-app-muted"
                >
                  {t(emptyMessage)}
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => {
                const globalIdx = (page - 1) * pageSize + i
                return (
                  <tr
                    key={globalIdx}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'bg-white hover:bg-gray-50 transition-colors',
                      onRowClick && 'cursor-pointer',
                      selected.has(globalIdx) && 'bg-primary-lighter',
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(globalIdx)}
                          onChange={() => toggleRow(globalIdx)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-app-text',
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '',
                        )}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : String(row[col.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
            {totalsRow && (
              <tr className="bg-blue-50 border-t-2 border-blue-200 font-semibold text-blue-900">
                {selectable && <td />}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '',
                    )}
                  >
                    {totalsRow[col.key] !== undefined
                      ? col.render
                        ? col.render(totalsRow[col.key], totalsRow as T)
                        : String(totalsRow[col.key])
                      : ''}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-app-muted">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} {t('sur')} {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded border border-app-border disabled:opacity-40 hover:bg-gray-50"
            >
              ‹
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={cn(
                    'px-2.5 py-1 rounded border text-sm',
                    pg === page
                      ? 'bg-primary text-white border-primary'
                      : 'border-app-border hover:bg-gray-50',
                  )}
                >
                  {pg}
                </button>
              )
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 rounded border border-app-border disabled:opacity-40 hover:bg-gray-50"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
