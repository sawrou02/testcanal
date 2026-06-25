import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { formatDate } from '../../lib/utils'
import { listEchus, type AbonneRow } from '../../lib/api'
import { Card, PageHeader, statutBadge, fullName, asRows, type Row } from './shared'
import { useSmsRelance } from './useSmsRelance'
import { WhatsAppButton, exportNumbers } from './relanceActions'

export default function EchusPage() {
  const toast = useToast()
  const { canSendSms, sending, sendSms } = useSmsRelance()

  const [rows, setRows] = useState<AbonneRow[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await listEchus())
    } catch {
      toast.error('Erreur lors du chargement')
      setRows([])
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
      <PageHeader
        title="Liste des échus"
        subtitle="Abonnés dont l'abonnement est arrivé à échéance"
      />

      <Card>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="text-base font-bold text-app-text" style={{ color: 'var(--text)' }}>
            Abonnés échus
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => exportNumbers(rows, 'Numéros — Abonnés échus')}
              disabled={rows.length === 0}
            >
              Exporter les numéros
            </Button>
            {canSendSms && (
              <Button
                onClick={() => void sendSms(rows)}
                loading={sending}
                disabled={rows.length === 0}
              >
                Relancer par SMS ({rows.length})
              </Button>
            )}
          </div>
        </div>
        <DataTable<Row>
          loading={loading}
          rows={asRows(rows)}
          emptyMessage="Aucun abonné échu"
          columns={[
            { key: 'numAbonne', label: 'N° Abonné' },
            { key: 'nom', label: 'Nom', render: (_v, row) => fullName(row as unknown as AbonneRow) },
            { key: 'tel1', label: 'Téléphone' },
            {
              key: 'formule',
              label: 'Formule',
              render: (_v, row) => (row as unknown as AbonneRow).formule?.nomCommercial ?? '-',
            },
            {
              key: 'dateEcheance',
              label: 'Date échéance',
              render: (v) => (v ? formatDate(String(v)) : '-'),
            },
            {
              key: 'pdv',
              label: 'PDV',
              render: (_v, row) => (row as unknown as AbonneRow).pdv?.raisonSociale ?? '-',
            },
            {
              key: 'statut',
              label: 'Statut',
              render: (_v, row) => statutBadge((row as unknown as AbonneRow).statut),
            },
            {
              key: '__wa',
              label: 'WhatsApp',
              render: (_v, row) => <WhatsAppButton abonne={row as unknown as AbonneRow} />,
            },
          ]}
        />
      </Card>
    </div>
  )
}
