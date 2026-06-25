import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { formatFCFA, formatDate } from '../../lib/utils'
import {
  listAAE,
  serviceAbonnementStats,
  type AbonneRow,
  type ServiceAbonnementStats,
} from '../../lib/api'
import { Card, PageHeader, fullName, asRows, type Row } from './shared'
import { useSmsRelance } from './useSmsRelance'
import { WhatsAppButton, exportNumbers } from './relanceActions'

export default function AAEPage() {
  const toast = useToast()
  const { canSendSms, sending, sendSms } = useSmsRelance()

  const [rows, setRows] = useState<AbonneRow[]>([])
  const [stats, setStats] = useState<ServiceAbonnementStats | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)

  const refetch = useCallback(async () => {
    setLoadingList(true)
    setLoadingStats(true)
    try {
      const [list, st] = await Promise.all([listAAE(30), serviceAbonnementStats()])
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
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return (
    <div className="space-y-4">
      <PageHeader
        title="AAE — Abonnés à échéance"
        subtitle="Abonnés dont l'abonnement arrive à échéance dans les 30 prochains jours"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[7.5rem]">
        {loadingStats || !stats ? (
          <SkeletonCardGrid count={4} />
        ) : (
          <>
            <KpiCard
              label="Échéances 30j"
              value={String(stats.aae30)}
              delta={0}
              deltaLabel="abonnés à échéance"
              color="gold"
            />
            <KpiCard
              label="Actifs"
              value={String(stats.actifs)}
              delta={0}
              deltaLabel="abonnés actifs"
              color="green"
            />
            <KpiCard
              label="Échus"
              value={String(stats.echus)}
              delta={0}
              deltaLabel="abonnés échus"
              color="red"
            />
            <KpiCard
              label="ARPU"
              value={formatFCFA(stats.arpu)}
              delta={0}
              deltaLabel="revenu moyen / abonné"
              color="blue"
            />
          </>
        )}
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="text-base font-bold text-app-text" style={{ color: 'var(--text)' }}>
            Abonnés à échéance (30 jours)
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => exportNumbers(rows, 'Numéros — Abonnés à échéance')}
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
                Rappel SMS à tous ({rows.length})
              </Button>
            )}
          </div>
        </div>
        <DataTable<Row>
          loading={loadingList}
          rows={asRows(rows)}
          emptyMessage="Aucun abonné à échéance"
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
