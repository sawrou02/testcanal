import { CrudResourcePage } from '../../components/crud/CrudResourcePage'
import { Badge } from '../../components/ui/Badge'
import { getRoleLabel } from '../../lib/utils'
import type { Role } from '../../types'

type Row = Record<string, unknown>

const ROLES: Role[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'COMPTABLE',
  'LOGISTICIEN',
  'COMMERCIAL',
  'VENDEUR',
]

export default function ComptesPdvPage() {
  return (
    <CrudResourcePage
      title="Comptes PDV et Users"
      subtitle="Gestion des comptes utilisateurs"
      apiPath="/users"
      columns={[
        { key: 'nom', label: 'Nom' },
        { key: 'prenom', label: 'Prénom' },
        { key: 'email', label: 'Identifiant' },
        { key: 'role', label: 'Rôle', render: (v) => getRoleLabel(String(v ?? '')) },
        {
          key: 'pdv',
          label: 'PDV',
          render: (_v, row: Row) =>
            (row.pdv as { raisonSociale?: string } | undefined)?.raisonSociale ?? '-',
        },
        {
          key: 'statut',
          label: 'Statut',
          render: (v) => (
            <Badge variant={v === 'ACTIF' ? 'success' : 'neutral'}>{String(v ?? '-')}</Badge>
          ),
        },
      ]}
      formFields={[
        { name: 'prenom', label: 'Prénom', type: 'text', required: true },
        { name: 'nom', label: 'Nom', type: 'text', required: true },
        { name: 'email', label: 'Identifiant (nom de connexion)', type: 'text', required: true },
        { name: 'password', label: 'Mot de passe', type: 'text', required: true },
        {
          name: 'role',
          label: 'Rôle',
          type: 'select',
          options: ROLES.map((r) => ({ value: r, label: getRoleLabel(r) })),
        },
        {
          name: 'pdvId',
          label: 'PDV',
          type: 'select',
          optionsPath: '/pdvs',
          mapOption: (item) => ({
            value: (item.id ?? '') as string,
            label: String(item.raisonSociale ?? item.code ?? item.id ?? ''),
          }),
        },
      ]}
    />
  )
}
