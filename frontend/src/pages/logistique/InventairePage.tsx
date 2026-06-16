import { useCallback, useEffect, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { KpiCard } from '../../components/dashboard/KpiCard'
import {
  inventaire,
  logistiqueStats,
  type InventaireRow,
  type LogistiqueStats,
} from '../../lib/api'
import { Card, PageHeader, asRows, type Row } from './shared'

interface InventairePageProps {
  scope: 'entrepot' | 'pdv'
  type?: string
  title: string
}

export default function InventairePage({ scope, type, title }: InventairePageProps) {
  const toast = useToast()
  const [rows, setRows] = useState<InventaireRow[]>([])
  const [stats, setStats] = useState<LogistiqueStats | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)

  const refetch = useCallback(async () => {
    setLoadingList(true)
    setLoadingStats(true)
    try {
      const [list, st] = await Promise.all([inventaire(scope, type), logistiqueStats()])
      setRows(list)
      setStats(st)
    } catch {
      toast.error('Erreur lors du chargement')
      setRows([])
      setStats(null)
    } finally {
      setLoadingList(false)
      setLoadingStats(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, type])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const totalsRow: Row = {
    lieu: { code: '', nom: 'TOTAL' },
    z4: rows.reduce((s, r) => s + r.z4, 0),
    globaz: rows.reduce((s, r) => s + r.globaz, 0),
    g11: rows.reduce((s, r) => s + r.g11, 0),
    total: rows.reduce((s, r) => s + r.total, 0),
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        subtitle={
          scope === 'entrepot'
            ? 'Inventaire des décodeurs en entrepôt'
            : 'Inventaire des décodeurs sur le réseau PDV'
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[7.5rem]">
        {loadingStats || !stats ? (
          <SkeletonCardGrid count={4} />
        ) : (
          <>
            <KpiCard
              label="Total décodeurs"
              value={stats.totalDecodeurs.toLocaleString('fr-FR')}
              delta={0}
              deltaLabel="décodeurs"
              color="blue"
              icon="📦"
            />
            <KpiCard
              label="En entrepôt"
              value={stats.enEntrepot.toLocaleString('fr-FR')}
              delta={0}
              deltaLabel="en stock"
              color="green"
              icon="🏬"
            />
            <KpiCard
              label="En PDV"
              value={stats.enPdv.toLocaleString('fr-FR')}
              delta={0}
              deltaLabel="sur le réseau"
              color="gold"
              icon="🏪"
            />
            <KpiCard
              label="Immobilisés"
              value={stats.immobilises.toLocaleString('fr-FR')}
              delta={0}
              deltaLabel="à traiter"
              color="red"
              icon="⛔"
            />
          </>
        )}
      </div>

      <Card>
        <h3 className="text-base font-bold text-app-text mb-4" style={{ color: 'var(--text)' }}>
          {title}
        </h3>
        <div className="min-h-[420px]">
          <DataTable<Row>
            loading={loadingList}
            rows={asRows(rows)}
            emptyMessage="Aucun lieu à afficher"
            totalsRow={totalsRow}
            columns={[
              {
                key: 'lieu',
                label: 'Lieu',
                render: (_v, row) => (row as unknown as InventaireRow).lieu?.nom ?? '—',
              },
              {
                key: 'code',
                label: 'Code',
                render: (_v, row) => (row as unknown as InventaireRow).lieu?.code ?? '—',
              },
              { key: 'z4', label: 'Z4', align: 'right' },
              { key: 'globaz', label: 'GLOBAZ', align: 'right' },
              { key: 'g11', label: 'G11', align: 'right' },
              { key: 'total', label: 'Total', align: 'right' },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
