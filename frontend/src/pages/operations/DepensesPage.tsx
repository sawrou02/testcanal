import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { DataTable } from '../../components/ui/DataTable'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { RowDeleteButton } from '../../components/ui/RowDeleteButton'
import { useAuthStore } from '../../store/authStore'
import { formatFCFA, formatDate } from '../../lib/utils'
import {
  listDepenses,
  depensesStats,
  createDepense,
  type DepenseRow,
  type DepensesStats,
} from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

const MUT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE']
const CATEGORIES = ['Loyer', 'Carburant', 'Salaires', 'Maintenance', 'Fournitures', 'Autre']

export default function DepensesPage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT_ROLES.includes(role) : false

  const [rows, setRows] = useState<DepenseRow[]>([])
  const [stats, setStats] = useState<DepensesStats | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const [r, s] = await Promise.all([listDepenses(), depensesStats()])
      setRows(r)
      setStats(s)
    } catch {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [date, setDate] = useState('')
  const [categorie, setCategorie] = useState(CATEGORIES[0])
  const [motif, setMotif] = useState('')
  const [montant, setMontant] = useState(0)
  const [justificatif, setJustificatif] = useState('')

  const openModal = () => {
    setDate('')
    setCategorie(CATEGORIES[0])
    setMotif('')
    setMontant(0)
    setJustificatif('')
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !motif.trim() || montant <= 0) {
      toast.error('Veuillez renseigner date, motif et montant')
      return
    }
    setSubmitting(true)
    try {
      await createDepense({ date, categorie, motif: motif.trim(), montant, justificatif: justificatif.trim() || undefined })
      toast.success('Dépense enregistrée ✓')
      setOpen(false)
      void refetch()
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  const topCat = stats?.parCategorie?.slice().sort((a, b) => b.montant - a.montant)[0]
  const totalsRow = useMemo<Partial<Row>>(
    () => ({ date: 'TOTAL', montant: rows.reduce((a, r) => a + Number(r.montant ?? 0), 0) }),
    [rows],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Dépenses internes" subtitle="Suivi des dépenses du mois en cours" />
        {canMutate && (
          <Button variant="primary" onClick={openModal}>
            + Nouvelle dépense
          </Button>
        )}
      </div>

      <div className="min-h-[7.5rem]">
        {loading || !stats ? (
          <SkeletonCardGrid count={3} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Total du mois" value={formatFCFA(stats.totalMois)} delta={0} deltaLabel="mois en cours" color="red" />
            <KpiCard label="Nombre de dépenses" value={String(stats.count)} delta={0} deltaLabel="mois en cours" color="blue" />
            <KpiCard label="Top catégorie" value={topCat ? topCat.categorie : '—'} delta={0} deltaLabel={topCat ? formatFCFA(topCat.montant) : ''} color="gold" />
          </div>
        )}
      </div>

      <Card>
        <div className="min-h-[420px]">
          <DataTable<Row>
            loading={loading}
            rows={rows as unknown as Row[]}
            totalsRow={totalsRow}
            emptyMessage="Aucune dépense"
            columns={[
              { key: 'date', label: 'Date', render: (v) => (String(v) === 'TOTAL' ? 'TOTAL' : v ? formatDate(String(v)) : '-') },
              { key: 'categorie', label: 'Catégorie' },
              { key: 'motif', label: 'Motif' },
              { key: 'montant', label: 'Montant', align: 'right', render: (v) => formatFCFA(Number(v ?? 0)) },
              { key: 'justificatif', label: 'Justificatif', render: (v) => (v ? String(v) : '—') },
              ...(canMutate
                ? [{ key: '__del', label: '', render: (_v: unknown, row: Row) => (
                    <RowDeleteButton path="/depenses" id={String((row as { id: string }).id)} confirmLabel="Supprimer cette dépense ?" onDone={refetch} />
                  ) }]
                : []),
            ]}
          />
        </div>
      </Card>

      <Modal isOpen={open} onClose={() => !submitting && setOpen(false)} title="Nouvelle dépense">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Date</FieldLabel>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <FieldLabel>Catégorie</FieldLabel>
              <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <FieldLabel>Motif</FieldLabel>
            <input type="text" value={motif} onChange={(e) => setMotif(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Montant (FCFA)</FieldLabel>
              <input type="number" value={montant === 0 ? '' : montant} onChange={(e) => setMontant(Number(e.target.value) || 0)} placeholder="0" className={inputCls} />
            </div>
            <div>
              <FieldLabel>Justificatif (optionnel)</FieldLabel>
              <input type="text" value={justificatif} onChange={(e) => setJustificatif(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>Annuler</Button>
            <Button type="submit" variant="primary" loading={submitting}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
