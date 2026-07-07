import { useCallback, useEffect, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { formatFCFA } from '../../lib/utils'
import { arpuPdv, type ArpuPdvRow } from '../../lib/api'
import { Card, PageHeader, PeriodeSelector, currentMonth, money, num, type Row } from './shared'

export default function ArpuPage() {
  const toast = useToast()
  const [periode, setPeriode] = useState(currentMonth())
  const [rows, setRows] = useState<ArpuPdvRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (p: string) => {
    setLoading(true)
    try {
      setRows(await arpuPdv(p))
    } catch {
      toast.error("Erreur lors du chargement de l'ARPU")
      setRows([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void fetchData(periode)
  }, [periode, fetchData])

  const sumCa = rows.reduce((s, r) => s + (Number(r.caTotal) || 0), 0)
  const sumAbo = rows.reduce((s, r) => s + (Number(r.abonnesActifs) || 0), 0)
  const arpuReseau = sumAbo > 0 ? Math.round(sumCa / sumAbo) : 0

  const columns = [
    {
      key: 'pdv',
      label: 'PDV',
      render: (_v: unknown, row: Row) => (row as unknown as ArpuPdvRow).pdv?.raisonSociale ?? '-',
    },
    { key: 'abonnesActifs', label: 'Abonnés actifs', align: 'right' as const, render: num },
    { key: 'caTotal', label: 'CA total', align: 'right' as const, render: money },
    {
      key: 'arpu',
      label: 'ARPU',
      align: 'right' as const,
      render: (v: unknown) => <span className="font-bold text-primary-dark">{money(v)}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="ARPU" subtitle="Revenu moyen par abonné, par point de vente">
        <PeriodeSelector periode={periode} onChange={setPeriode} />
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[7.5rem]">
        {loading ? (
          <SkeletonCardGrid count={4} />
        ) : (
          <>
            <KpiCard label="ARPU réseau" value={formatFCFA(arpuReseau)} delta={0} deltaLabel="revenu moyen / abonné" color="green" icon="trend" />
            <KpiCard label="CA total" value={formatFCFA(sumCa)} delta={0} deltaLabel="période" color="blue" icon="card" />
            <KpiCard label="Abonnés actifs" value={num(sumAbo)} delta={0} deltaLabel="réseau" color="gold" icon="users" />
            <KpiCard label="Nb PDV" value={num(rows.length)} delta={0} deltaLabel="points de vente" color="blue" icon="card" />
          </>
        )}
      </div>

      <Card>
        <h3 className="text-base font-bold text-app-text mb-4" style={{ color: 'var(--text)' }}>
          ARPU par PDV — {periode}
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
