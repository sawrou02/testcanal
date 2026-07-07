import { useCallback, useEffect, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { classementPdv, type ClassementPdvRow } from '../../lib/api'
import { Card, PageHeader, PeriodeSelector, currentMonth, money, num, type Row } from './shared'

const rankColor = (rang: number) =>
  rang === 1 ? '#E2A000' : rang === 2 ? '#9AA3AE' : rang === 3 ? '#B5723A' : ''

export default function ClassementPage() {
  const toast = useToast()
  const [periode, setPeriode] = useState(currentMonth())
  const [rows, setRows] = useState<ClassementPdvRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (p: string) => {
    setLoading(true)
    try {
      setRows(await classementPdv(p))
    } catch {
      toast.error('Erreur lors du chargement du classement')
      setRows([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void fetchData(periode)
  }, [periode, fetchData])

  const columns = [
    {
      key: 'rang',
      label: 'Rang',
      render: (v: unknown) => {
        const r = Number(v) || 0
        const c = rankColor(r)
        if (c) {
          return (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold" style={{ background: c }}>{r}</span>
          )
        }
        return <span className="font-bold">{r}</span>
      },
    },
    {
      key: 'pdv',
      label: 'PDV',
      render: (_v: unknown, row: Row) => (row as unknown as ClassementPdvRow).pdv?.raisonSociale ?? '-',
    },
    { key: 'secteur', label: 'Secteur' },
    { key: 'nbOps', label: 'Nb ops', align: 'right' as const, render: num },
    { key: 'caTotal', label: 'CA Total', align: 'right' as const, render: money },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Classement PDV" subtitle="Classement des points de vente par chiffre d'affaires">
        <PeriodeSelector periode={periode} onChange={setPeriode} />
      </PageHeader>

      <Card>
        <h3 className="text-base font-bold text-app-text mb-4" style={{ color: 'var(--text)' }}>
          Classement — {periode}
        </h3>
        <div className="min-h-[420px]">
          <DataTable<Row>
            columns={columns}
            rows={rows as unknown as Row[]}
            loading={loading}
            emptyMessage="Aucune donnée pour cette période"
          />
        </div>
      </Card>
    </div>
  )
}
