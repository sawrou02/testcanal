import { useCallback, useEffect, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { formatDate } from '../../lib/utils'
import { listDecodeurs, type DecodeurRow } from '../../lib/api'
import { Card, PageHeader, asRows, statutBadge, typeBadge, type Row } from './shared'

interface DecodeursPageProps {
  scope?: 'entrepot' | 'pdv'
  type?: string
  title: string
}

export default function DecodeursPage({ scope, type, title }: DecodeursPageProps) {
  const toast = useToast()
  const [rows, setRows] = useState<DecodeurRow[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listDecodeurs({ scope, type })
      setRows(list)
    } catch {
      toast.error('Erreur lors du chargement')
      setRows([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, type])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle="Consultation du parc de décodeurs" />

      <Card>
        <h3 className="text-base font-bold text-app-text mb-4" style={{ color: 'var(--text)' }}>
          {title}
        </h3>
        <div className="min-h-[420px]">
          <DataTable<Row>
            loading={loading}
            rows={asRows(rows)}
            searchable
            emptyMessage="Aucun décodeur à afficher"
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
                render: (_v, row) => statutBadge((row as unknown as DecodeurRow).statut),
              },
              {
                key: 'entrepot',
                label: 'Entrepôt',
                render: (_v, row) => (row as unknown as DecodeurRow).entrepot?.nom ?? '—',
              },
              {
                key: 'pdv',
                label: 'PDV',
                render: (_v, row) => (row as unknown as DecodeurRow).pdv?.raisonSociale ?? '—',
              },
              {
                key: 'dateEntree',
                label: 'Date entrée',
                render: (v) => (v ? formatDate(String(v)) : '—'),
              },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
