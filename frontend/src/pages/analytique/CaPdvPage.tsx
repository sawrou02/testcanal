import { useCallback, useEffect, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { formatFCFA } from '../../lib/utils'
import { caPdv, type CaPdvRow } from '../../lib/api'
import { Card, PageHeader, PeriodeSelector, currentMonth, money, num, type Row } from './shared'

export default function CaPdvPage({ title }: { title?: string }) {
  const toast = useToast()
  const [periode, setPeriode] = useState(currentMonth())
  const [rows, setRows] = useState<CaPdvRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (p: string) => {
    setLoading(true)
    try {
      setRows(await caPdv(p))
    } catch {
      toast.error('Erreur lors du chargement du CA par PDV')
      setRows([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void fetchData(periode)
  }, [periode, fetchData])

  const caTotalReseau = rows.reduce((s, r) => s + (Number(r.caTotal) || 0), 0)
  const caRecruTotal = rows.reduce((s, r) => s + (Number(r.caRecru) || 0), 0)
  const caReaboTotal = rows.reduce((s, r) => s + (Number(r.caReabo) || 0), 0)

  const columns = [
    {
      key: 'pdv',
      label: 'PDV',
      render: (_v: unknown, row: Row) => (row as unknown as CaPdvRow).pdv?.raisonSociale ?? '-',
    },
    { key: 'secteur', label: 'Secteur' },
    { key: 'nbOps', label: 'Nb ops', align: 'right' as const, render: num },
    { key: 'caRecru', label: 'CA Recrut.', align: 'right' as const, render: money },
    { key: 'caReabo', label: 'CA Réabo', align: 'right' as const, render: money },
    {
      key: 'caTotal',
      label: 'CA Total',
      align: 'right' as const,
      render: (v: unknown) => <span className="font-bold text-primary-dark">{money(v)}</span>,
    },
  ]

  const totalsRow: Partial<Row> | undefined = rows.length
    ? {
        pdv: { code: '', raisonSociale: 'TOTAL' },
        nbOps: rows.reduce((s, r) => s + (Number(r.nbOps) || 0), 0),
        caRecru: caRecruTotal,
        caReabo: caReaboTotal,
        caTotal: caTotalReseau,
      }
    : undefined

  return (
    <div className="space-y-4">
      <PageHeader title={title ?? 'CA par PDV'} subtitle="Chiffre d'affaires recrutement et réabonnement par point de vente">
        <PeriodeSelector periode={periode} onChange={setPeriode} />
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[7.5rem]">
        {loading ? (
          <SkeletonCardGrid count={4} />
        ) : (
          <>
            <KpiCard label="CA total réseau" value={formatFCFA(caTotalReseau)} delta={0} deltaLabel="période" color="green" icon="card" />
            <KpiCard label="Nb PDV" value={num(rows.length)} delta={0} deltaLabel="points de vente" color="blue" icon="card" />
            <KpiCard label="CA recrut. total" value={formatFCFA(caRecruTotal)} delta={0} deltaLabel="recrutements" color="gold" icon="plus" />
            <KpiCard label="CA réabo total" value={formatFCFA(caReaboTotal)} delta={0} deltaLabel="réabonnements" color="blue" icon="trend" />
          </>
        )}
      </div>

      <Card>
        <h3 className="text-base font-bold text-app-text mb-4" style={{ color: 'var(--text)' }}>
          Détail par PDV — {periode}
        </h3>
        <div className="min-h-[420px]">
          <DataTable<Row>
            columns={columns}
            rows={rows as unknown as Row[]}
            loading={loading}
            emptyMessage="Aucune donnée pour cette période"
            totalsRow={totalsRow}
          />
        </div>
      </Card>
    </div>
  )
}
