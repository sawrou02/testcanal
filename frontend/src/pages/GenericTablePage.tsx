import { useParams } from 'react-router-dom'
import { DataTable } from '../components/ui/DataTable'

const PLACEHOLDER_ROWS = Array.from({ length: 25 }, (_, i) => ({
  id: `row-${i + 1}`,
  reference: `REF-2026-${String(i + 1).padStart(4, '0')}`,
  libelle: `Élément ${i + 1}`,
  statut: i % 3 === 0 ? 'Actif' : i % 3 === 1 ? 'Inactif' : 'En attente',
  date: new Date(2026, 5, (i % 28) + 1).toLocaleDateString('fr-FR'),
  montant: ((i + 1) * 12500).toLocaleString('fr-FR') + ' F',
}))

const COLUMNS = [
  { key: 'reference', label: 'Référence' },
  { key: 'libelle', label: 'Libellé' },
  { key: 'statut', label: 'Statut' },
  { key: 'date', label: 'Date' },
  { key: 'montant', label: 'Montant', align: 'right' as const },
]

export default function GenericTablePage() {
  const { pageId } = useParams<{ pageId: string }>()

  const title = pageId
    ? pageId
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Page'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-app-text" style={{ color: 'var(--text)' }}>
          {title}
        </h2>
        <p className="text-sm text-app-muted mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Module en cours de développement — données de démonstration
        </p>
      </div>

      <div
        className="bg-white rounded-xl border border-app-border p-5 shadow-sm"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <DataTable
          columns={COLUMNS}
          rows={PLACEHOLDER_ROWS}
          searchable
          selectable
          pageSize={10}
        />
      </div>
    </div>
  )
}
