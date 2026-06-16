import { useCallback, useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { DataTable } from '../ui/DataTable'
import { useToast } from '../ui/Toast'
import { SkeletonCardGrid } from '../ui/Skeleton'
import { KpiCard } from '../dashboard/KpiCard'
import { useResource } from '../../hooks/useResource'
import { useAuthStore } from '../../store/authStore'
import { formatFCFA, formatDate, cn } from '../../lib/utils'
import type {
  Versement,
  MouvementStats,
  CreateVersementBody,
} from '../../lib/api'

interface Pdv {
  id: string
  raisonSociale: string
  code?: string
}

interface Banque {
  id: string
  nom: string
}

const MUTATION_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COMPTABLE']

export interface MouvementBanquePageProps {
  title: string
  subtitle: string
  formTitle: string
  listTitle: string
  submitLabel: string
  /** Fetch the list of mouvements. */
  list: () => Promise<Versement[]>
  /** Fetch aggregate stats. */
  stats: () => Promise<MouvementStats>
  /** Create a new mouvement. */
  create: (body: CreateVersementBody) => Promise<Versement>
  /** Validate a pending mouvement. */
  valider: (id: string) => Promise<Versement>
  /** Reject a pending mouvement with a reason. */
  rejeter: (id: string, motif: string) => Promise<Versement>
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('bg-white rounded-xl border border-app-border p-5 shadow-sm', className)}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-app-text block mb-1.5">{children}</label>
}

const inputCls =
  'w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20'

function statutBadge(statut: Versement['statut']) {
  if (statut === 'VALIDE') return <Badge variant="success">Validé</Badge>
  if (statut === 'ENATTENTE') return <Badge variant="warning">En attente</Badge>
  return <Badge variant="danger">Rejeté</Badge>
}

export function MouvementBanquePage(props: MouvementBanquePageProps) {
  const { title, subtitle, formTitle, listTitle, submitLabel } = props
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUTATION_ROLES.includes(role) : false

  const { data: pdvs } = useResource<Pdv>('/pdvs')
  const { data: banques } = useResource<Banque>('/banques')

  const [rows, setRows] = useState<Versement[]>([])
  const [stats, setStats] = useState<MouvementStats | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)

  const refetch = useCallback(async () => {
    setLoadingList(true)
    setLoadingStats(true)
    try {
      const [list, st] = await Promise.all([props.list(), props.stats()])
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

  // --- Form state ---
  const [pdvId, setPdvId] = useState('')
  const [banqueId, setBanqueId] = useState('')
  const [numBordereau, setNumBordereau] = useState('')
  const [montant, setMontant] = useState<number>(0)
  const [dateVersement, setDateVersement] = useState('')
  const [periode, setPeriode] = useState('')
  const [libelle, setLibelle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setPdvId('')
    setBanqueId('')
    setNumBordereau('')
    setMontant(0)
    setDateVersement('')
    setPeriode('')
    setLibelle('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pdvId || !banqueId || !numBordereau.trim() || montant <= 0 || !dateVersement) {
      toast.error('Veuillez renseigner tous les champs obligatoires')
      return
    }
    setSubmitting(true)
    try {
      await props.create({
        pdvId,
        banqueId,
        numBordereau: numBordereau.trim(),
        montant,
        dateVersement,
        periode,
        libelle,
      })
      toast.success('Enregistré ✓')
      resetForm()
      void refetch()
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  // --- Reject modal ---
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [motif, setMotif] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const openReject = (id: string) => {
    setRejectId(id)
    setMotif('')
  }

  const handleValider = async (id: string) => {
    try {
      await props.valider(id)
      toast.success('Mouvement validé ✓')
      void refetch()
    } catch {
      toast.error('Erreur lors de la validation')
    }
  }

  const handleReject = async () => {
    if (!rejectId) return
    if (!motif.trim()) {
      toast.error('Le motif est requis')
      return
    }
    setRejecting(true)
    try {
      await props.rejeter(rejectId, motif.trim())
      toast.success('Mouvement rejeté')
      setRejectId(null)
      setMotif('')
      void refetch()
    } catch {
      toast.error('Erreur lors du rejet')
    } finally {
      setRejecting(false)
    }
  }

  type Row = Versement & Record<string, unknown>
  const columns = [
    { key: 'numBordereau', label: 'Bordereau' },
    {
      key: 'pdv',
      label: 'PDV',
      render: (_v: unknown, row: Row) => row.pdv?.raisonSociale ?? '-',
    },
    {
      key: 'montant',
      label: 'Montant',
      align: 'right' as const,
      render: (_v: unknown, row: Row) => formatFCFA(row.montant),
    },
    { key: 'banqueNom', label: 'Banque' },
    {
      key: 'dateVersement',
      label: 'Date',
      render: (_v: unknown, row: Row) => formatDate(row.dateVersement),
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (_v: unknown, row: Row) => statutBadge(row.statut),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_v: unknown, row: Row) => {
        if (row.statut !== 'ENATTENTE' || !canMutate) return null
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation()
                void handleValider(row.id)
              }}
            >
              Valider
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation()
                openReject(row.id)
              }}
            >
              Rejeter
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-app-text" style={{ color: 'var(--text)' }}>
          {title}
        </h2>
        <p className="text-sm text-app-muted mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {subtitle}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingStats || !stats ? (
          <SkeletonCardGrid count={4} />
        ) : (
          <>
            <KpiCard
              label="Validés ce mois"
              value={formatFCFA(stats.validesMontantMois)}
              delta={0}
              deltaLabel="ce mois"
              color="green"
              icon="✅"
            />
            <KpiCard
              label="En attente"
              value={stats.enAttenteCount.toLocaleString('fr-FR')}
              delta={0}
              deltaLabel="à traiter"
              color="gold"
              icon="⏳"
            />
            <KpiCard
              label="Rejetés"
              value={stats.rejeteCount.toLocaleString('fr-FR')}
              delta={0}
              deltaLabel="ce mois"
              color="red"
              icon="✕"
            />
            <KpiCard
              label="Total"
              value={stats.totalCount.toLocaleString('fr-FR')}
              delta={0}
              deltaLabel="mouvements"
              color="blue"
              icon="🏦"
            />
          </>
        )}
      </div>

      {/* Two-column: form + list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* LEFT — form */}
        <div className="lg:col-span-1">
          <Card>
            <h3 className="text-base font-bold text-app-text mb-4" style={{ color: 'var(--text)' }}>
              {formTitle}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <FieldLabel>PDV *</FieldLabel>
                <select value={pdvId} onChange={(e) => setPdvId(e.target.value)} className={inputCls}>
                  <option value="">— Sélectionner —</option>
                  {pdvs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code ? `${p.code} — ` : ''}{p.raisonSociale}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Banque *</FieldLabel>
                <select value={banqueId} onChange={(e) => setBanqueId(e.target.value)} className={inputCls}>
                  <option value="">— Sélectionner —</option>
                  {banques.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>N° bordereau *</FieldLabel>
                <input
                  type="text"
                  value={numBordereau}
                  onChange={(e) => setNumBordereau(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Montant *</FieldLabel>
                <input
                  type="number"
                  value={montant === 0 ? '' : montant}
                  onChange={(e) => setMontant(Number(e.target.value) || 0)}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Date *</FieldLabel>
                <input
                  type="date"
                  value={dateVersement}
                  onChange={(e) => setDateVersement(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Période</FieldLabel>
                <input
                  type="text"
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value)}
                  placeholder="ex. 2026-06"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Libellé</FieldLabel>
                <input
                  type="text"
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  className={inputCls}
                />
              </div>
              <Button type="submit" variant="primary" className="w-full" loading={submitting}>
                {submitLabel}
              </Button>
            </form>
          </Card>
        </div>

        {/* RIGHT — list */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-base font-bold text-app-text mb-4" style={{ color: 'var(--text)' }}>
              {listTitle}
            </h3>
            <div className="min-h-[420px]">
              <DataTable
                columns={columns}
                rows={rows as Row[]}
                loading={loadingList}
                emptyMessage="Aucun mouvement"
              />
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={rejectId !== null}
        onClose={() => (rejecting ? undefined : setRejectId(null))}
        title="Rejeter le mouvement"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectId(null)} disabled={rejecting}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleReject} loading={rejecting}>
              Confirmer le rejet
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <FieldLabel>Motif du rejet *</FieldLabel>
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="Indiquez la raison du rejet…"
          />
        </div>
      </Modal>
    </div>
  )
}
