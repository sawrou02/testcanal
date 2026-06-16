import { useCallback, useEffect, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { cn, formatDate } from '../../lib/utils'
import {
  listImmobilises,
  logistiqueStats,
  type ImmobiliseRow,
  type LogistiqueStats,
} from '../../lib/api'
import { Card, PageHeader, asRows, statutBadge, typeBadge, type Row } from './shared'

interface ImmobilisesPageProps {
  type?: string
  title: string
}

export default function ImmobilisesPage({ type, title }: ImmobilisesPageProps) {
  const toast = useToast()
  const [rows, setRows] = useState<ImmobiliseRow[]>([])
  const [stats, setStats] = useState<LogistiqueStats | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)

  const refetch = useCallback(async () => {
    setLoadingList(true)
    setLoadingStats(true)
    try {
      const [list, st] = await Promise.all([listImmobilises(type), logistiqueStats()])
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
  }, [type])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        subtitle="Décodeurs immobilisés en stock depuis trop longtemps"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[7.5rem]">
        {loadingStats || !stats ? (
          <SkeletonCardGrid count={1} />
        ) : (
          <KpiCard
            label="Décodeurs immobilisés"
            value={stats.immobilises.toLocaleString('fr-FR')}
            delta={0}
            deltaLabel="à traiter"
            color="red"
            icon="⛔"
          />
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
            searchable
            emptyMessage="Aucun décodeur immobilisé"
            columns={[
              {
                key: 'numSerie',
                label: 'N° série',
                render: (v) => <span className="font-mono">{String(v ?? '—')}</span>,
              },
              {
                key: 'type',
                label: 'Type',
                render: (v) => typeBadge(String(v ?? '—')),
              },
              {
                key: 'statut',
                label: 'Statut',
                render: (_v, row) => statutBadge((row as unknown as ImmobiliseRow).statut),
              },
              {
                key: 'localisation',
                label: 'Localisation',
                render: (_v, row) => {
                  const r = row as unknown as ImmobiliseRow
                  return r.entrepot?.nom ?? r.pdv?.raisonSociale ?? '—'
                },
              },
              {
                key: 'dateEntree',
                label: 'Date entrée',
                render: (v) => (v ? formatDate(String(v)) : '—'),
              },
              {
                key: 'joursImmobilise',
                label: 'Jours immobilisé',
                align: 'right',
                render: (v) => {
                  const jours = Number(v ?? 0)
                  return (
                    <span className={cn('font-semibold', jours > 120 && 'text-danger')}>
                      {jours.toLocaleString('fr-FR')}
                    </span>
                  )
                },
              },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
