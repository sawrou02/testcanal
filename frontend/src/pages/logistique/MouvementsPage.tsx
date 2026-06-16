import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { formatDate } from '../../lib/utils'
import {
  listMouvements,
  createMouvement,
  type MouvementRow,
  type MouvementType,
  type CreateMouvementBody,
} from '../../lib/api'
import { Card, PageHeader, asRows, LOGISTIQUE_MUTATION_ROLES, type Row } from './shared'

interface MouvementsPageProps {
  title: string
}

const TYPE_OPTIONS: { value: MouvementType; label: string }[] = [
  { value: 'EN_ENTREPOT_PDV', label: 'Entrepôt → PDV' },
  { value: 'PDV_PDV', label: 'PDV → PDV' },
  { value: 'ENTREPOT_ENTREPOT', label: 'Entrepôt → Entrepôt' },
  { value: 'PDV_ENTREPOT', label: 'PDV → Entrepôt' },
]

const TYPE_LABEL: Record<MouvementType, string> = {
  EN_ENTREPOT_PDV: 'Entrepôt → PDV',
  PDV_PDV: 'PDV → PDV',
  ENTREPOT_ENTREPOT: 'Entrepôt → Entrepôt',
  PDV_ENTREPOT: 'PDV → Entrepôt',
}

const inputCls =
  'w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-app-text block mb-1.5">{children}</label>
}

export default function MouvementsPage({ title }: MouvementsPageProps) {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? LOGISTIQUE_MUTATION_ROLES.includes(role) : false

  const [rows, setRows] = useState<MouvementRow[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listMouvements()
      setRows(list)
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

  // --- Modal form state ---
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [type, setType] = useState<MouvementType>('EN_ENTREPOT_PDV')
  const [materiel, setMateriel] = useState('')
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [quantite, setQuantite] = useState<number>(0)
  const [numBonLivraison, setNumBonLivraison] = useState('')
  const [date, setDate] = useState('')

  const resetForm = () => {
    setType('EN_ENTREPOT_PDV')
    setMateriel('')
    setSource('')
    setDestination('')
    setQuantite(0)
    setNumBonLivraison('')
    setDate('')
  }

  const openModal = () => {
    resetForm()
    setModalOpen(true)
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !materiel.trim() ||
      !source.trim() ||
      !destination.trim() ||
      quantite <= 0 ||
      !numBonLivraison.trim() ||
      !date
    ) {
      toast.error('Veuillez renseigner tous les champs')
      return
    }
    setSubmitting(true)
    try {
      const body: CreateMouvementBody = {
        type,
        materiel: materiel.trim(),
        sourceId: source.trim(),
        destinationId: destination.trim(),
        quantite,
        numBonLivraison: numBonLivraison.trim(),
        date,
      }
      await createMouvement(body)
      toast.success('Mouvement enregistré ✓')
      setModalOpen(false)
      void refetch()
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title={title} subtitle="Mouvements de stock et livraisons" />
        {canMutate && (
          <Button variant="primary" onClick={openModal}>
            + Nouveau mouvement / Livraison
          </Button>
        )}
      </div>

      <Card>
        <h3 className="text-base font-bold text-app-text mb-4" style={{ color: 'var(--text)' }}>
          {title}
        </h3>
        <div className="min-h-[420px]">
          <DataTable<Row>
            loading={loading}
            rows={asRows(rows)}
            searchable
            emptyMessage="Aucun mouvement"
            columns={[
              {
                key: 'date',
                label: 'Date',
                render: (v) => (v ? formatDate(String(v)) : '—'),
              },
              {
                key: 'type',
                label: 'Type',
                render: (_v, row) => {
                  const t = (row as unknown as MouvementRow).type
                  return <Badge variant="info">{TYPE_LABEL[t] ?? String(t)}</Badge>
                },
              },
              { key: 'materiel', label: 'Matériel' },
              { key: 'quantite', label: 'Quantité', align: 'right' },
              { key: 'numBonLivraison', label: 'N° bon' },
              { key: 'sourceNom', label: 'Source' },
              { key: 'destinationNom', label: 'Destination' },
              {
                key: 'statut',
                label: 'Statut',
                render: (v) => <Badge variant="neutral">{String(v ?? '—')}</Badge>,
              },
            ]}
          />
        </div>
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title="Nouveau mouvement / Livraison">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel>Type</FieldLabel>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MouvementType)}
              className={inputCls}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Matériel</FieldLabel>
            <input
              type="text"
              value={materiel}
              onChange={(e) => setMateriel(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Source</FieldLabel>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel>Destination</FieldLabel>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Quantité</FieldLabel>
              <input
                type="number"
                value={quantite === 0 ? '' : quantite}
                onChange={(e) => setQuantite(Number(e.target.value) || 0)}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel>N° bon livraison</FieldLabel>
              <input
                type="text"
                value={numBonLivraison}
                onChange={(e) => setNumBonLivraison(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Date</FieldLabel>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
