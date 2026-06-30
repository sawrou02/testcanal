import { useResource } from '../../hooks/useResource'
import { DataTable } from '../../components/ui/DataTable'
import { formatDate } from '../../lib/utils'
import { type AbonneRow } from '../../lib/api'
import { Card, PageHeader, fullName, asRows, type Row } from './shared'
import { WhatsAppButton } from './relanceActions'

export default function BienvenuePage() {
  const { data, loading } = useResource<AbonneRow>('/service-abonnement/bienvenue')

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bienvenue abonnés"
        subtitle="Abonnés récemment recrutés à accueillir"
      />

      <Card>
        <DataTable<Row>
          loading={loading}
          rows={asRows(data)}
          emptyMessage="Aucun nouvel abonné"
          columns={[
            { key: 'numAbonne', label: 'N° Abonné' },
            { key: 'nom', label: 'Nom', render: (_v, row) => fullName(row as unknown as AbonneRow) },
            {
              key: 'formule',
              label: 'Formule',
              render: (_v, row) => (row as unknown as AbonneRow).formule?.nomCommercial ?? '-',
            },
            {
              key: 'pdv',
              label: 'PDV',
              render: (_v, row) => (row as unknown as AbonneRow).pdv?.raisonSociale ?? '-',
            },
            {
              key: 'dateRecrutement',
              label: 'Date recrutement',
              render: (_v, row) => {
                const d = (row as unknown as AbonneRow).dateRecrutement
                return d ? formatDate(d) : '-'
              },
            },
            {
              key: '__wa',
              label: 'Bienvenue',
              render: (_v, row) => <WhatsAppButton abonne={row as unknown as AbonneRow} kind="bienvenue" />,
            },
          ]}
        />
      </Card>
    </div>
  )
}
