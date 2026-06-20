import { useCallback, useEffect, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { DataTable } from '../../components/ui/DataTable'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { formatFCFA } from '../../lib/utils'
import { vadAgents, vadStats, vadStock, type VadAgentRow, type VadStats, type VadStockRow } from '../../lib/api'
import { Card, PageHeader, type Row } from '../../components/ui/Section'

export default function ConsultationPage() {
  const toast = useToast()
  const [agents, setAgents] = useState<VadAgentRow[]>([])
  const [stock, setStock] = useState<VadStockRow[]>([])
  const [stats, setStats] = useState<VadStats | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const [a, s, st] = await Promise.all([vadAgents(), vadStock(), vadStats()])
      setAgents(a)
      setStock(s)
      setStats(st)
    } catch {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return (
    <div className="space-y-4">
      <PageHeader title="Consultation stock VAD" subtitle="Agents vendeurs à domicile, stock et ventes de kits" />

      <div className="min-h-[7.5rem]">
        {loading || !stats ? (
          <SkeletonCardGrid count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Agents VAD" value={String(stats.nbAgents)} delta={0} deltaLabel="actifs" color="blue" />
            <KpiCard label="Décodeurs attribués" value={String(stats.decodeursAttribues)} delta={0} deltaLabel="en stock VAD" color="green" />
            <KpiCard label="Kits vendus" value={String(stats.kitsVendusMois)} delta={0} deltaLabel="mois en cours" color="gold" />
            <KpiCard label="CA kits" value={formatFCFA(stats.caKitsMois)} delta={0} deltaLabel="mois en cours" color="green" />
          </div>
        )}
      </div>

      <Card>
        <h3 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>Agents VAD</h3>
        <div className="min-h-[240px]">
          <DataTable<Row>
            loading={loading}
            rows={agents as unknown as Row[]}
            searchable
            emptyMessage="Aucun agent VAD"
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'raisonSociale', label: 'Agent' },
              { key: 'secteur', label: 'Secteur' },
              { key: 'stockDecodeurs', label: 'Stock décodeurs', align: 'right' },
              { key: 'kitsVendus', label: 'Kits vendus', align: 'right' },
              { key: 'caKits', label: 'CA kits', align: 'right', render: (v) => formatFCFA(Number(v ?? 0)) },
            ]}
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>Décodeurs en stock VAD</h3>
        <div className="min-h-[240px]">
          <DataTable<Row>
            loading={loading}
            rows={stock as unknown as Row[]}
            searchable
            emptyMessage="Aucun décodeur en stock VAD"
            columns={[
              { key: 'numSerie', label: 'N° série' },
              { key: 'type', label: 'Type', render: (v) => <Badge variant="neutral">{String(v)}</Badge> },
              { key: 'pdv', label: 'Agent VAD', render: (_v, row) => (row as unknown as VadStockRow).pdv?.raisonSociale ?? '—' },
              { key: 'statut', label: 'Statut', render: (v) => <Badge variant="warning">{String(v)}</Badge> },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
