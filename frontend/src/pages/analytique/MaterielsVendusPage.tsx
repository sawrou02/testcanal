import { useCallback, useEffect, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { materielsVendus, type MaterielsVendusResult } from '../../lib/api'
import { Card, PageHeader, num, type Row } from './shared'

export default function MaterielsVendusPage() {
  const toast = useToast()
  const [data, setData] = useState<MaterielsVendusResult | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      setData(await materielsVendus())
    } catch {
      toast.error('Erreur lors du chargement des matériels vendus')
      setData(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const columns = [
    { key: 'type', label: 'Type' },
    { key: 'nb', label: 'Quantité vendue', align: 'right' as const, render: num },
  ]

  const rows = data?.parType ?? []

  return (
    <div className="space-y-4">
      <PageHeader title="Matériels Vendus" subtitle="Quantités de matériels vendus par type" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[7.5rem]">
        {loading || !data ? (
          <SkeletonCardGrid count={1} />
        ) : (
          <KpiCard label="Total matériels vendus" value={num(data.total)} delta={0} deltaLabel="unités" color="green" icon="package" />
        )}
      </div>

      <Card>
        <h3 className="text-base font-bold text-app-text mb-4" style={{ color: 'var(--text)' }}>
          Répartition par type
        </h3>
        <div className="min-h-[280px]">
          <DataTable<Row>
            columns={columns}
            rows={rows as unknown as Row[]}
            loading={loading}
            searchable={false}
            emptyMessage="Aucun matériel vendu"
          />
        </div>
      </Card>
    </div>
  )
}
