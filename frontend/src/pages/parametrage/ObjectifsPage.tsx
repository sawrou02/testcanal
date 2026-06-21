import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { DataTable } from '../../components/ui/DataTable'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { RowDeleteButton } from '../../components/ui/RowDeleteButton'
import { useResource } from '../../hooks/useResource'
import { useAuthStore } from '../../store/authStore'
import { formatFCFA } from '../../lib/utils'
import {
  suiviObjectifs,
  createObjectif,
  type SuiviObjectifRow,
} from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

const MUT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
const TYPES = [
  { value: 'CA', label: 'Chiffre d’affaires' },
  { value: 'RECRUTEMENT', label: 'Recrutement' },
  { value: 'REABO', label: 'Réabonnement' },
  { value: 'MIGRATION', label: 'Migration' },
]
const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface PdvLite { id: string; raisonSociale: string }

function tauxBadge(taux: number) {
  if (taux >= 100) return <Badge variant="success">{taux} %</Badge>
  if (taux >= 70) return <Badge variant="warning">{taux} %</Badge>
  return <Badge variant="danger">{taux} %</Badge>
}

export default function ObjectifsPage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT_ROLES.includes(role) : false
  const { data: pdvs } = useResource<PdvLite>('/pdvs')

  const [rows, setRows] = useState<SuiviObjectifRow[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await suiviObjectifs())
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
  const [pdvId, setPdvId] = useState('')
  const [typeObjectif, setTypeObjectif] = useState('CA')
  const [cible, setCible] = useState(0)
  const [periode, setPeriode] = useState(currentMonth())

  const openModal = () => {
    setPdvId('')
    setTypeObjectif('CA')
    setCible(0)
    setPeriode(currentMonth())
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cible <= 0 || !periode) {
      toast.error('Veuillez renseigner la cible et la période')
      return
    }
    setSubmitting(true)
    try {
      await createObjectif({ pdvId: pdvId || undefined, typeObjectif, cible, periode })
      toast.success('Objectif enregistré ✓')
      setOpen(false)
      void refetch()
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  const kpis = useMemo(() => {
    const n = rows.length
    const atteints = rows.filter((r) => r.taux >= 100).length
    const tauxMoyen = n ? Math.round((rows.reduce((a, r) => a + r.taux, 0) / n) * 10) / 10 : 0
    return { n, atteints, tauxMoyen }
  }, [rows])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Objectifs Distributeur et PDV" subtitle="Suivi des objectifs vs réalisé (mois en cours)" />
        {canMutate && (
          <Button variant="primary" onClick={openModal}>
            + Nouvel objectif
          </Button>
        )}
      </div>

      <div className="min-h-[7.5rem]">
        {loading ? (
          <SkeletonCardGrid count={3} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Objectifs suivis" value={String(kpis.n)} delta={0} deltaLabel="mois en cours" color="blue" />
            <KpiCard label="Atteints (≥100%)" value={String(kpis.atteints)} delta={0} deltaLabel="objectifs" color="green" />
            <KpiCard label="Taux moyen" value={`${kpis.tauxMoyen} %`} delta={0} deltaLabel="réalisation" color="gold" />
          </div>
        )}
      </div>

      <Card>
        <div className="min-h-[420px]">
          <DataTable<Row>
            loading={loading}
            rows={rows as unknown as Row[]}
            emptyMessage="Aucun objectif défini"
            columns={[
              { key: 'pdv', label: 'PDV / Distributeur' },
              { key: 'typeObjectif', label: 'Type' },
              { key: 'periode', label: 'Période' },
              { key: 'cible', label: 'Cible', align: 'right', render: (v, row) => ((row as unknown as SuiviObjectifRow).typeObjectif === 'CA' ? formatFCFA(Number(v ?? 0)) : String(v ?? 0)) },
              { key: 'realise', label: 'Réalisé', align: 'right', render: (v, row) => ((row as unknown as SuiviObjectifRow).typeObjectif === 'CA' ? formatFCFA(Number(v ?? 0)) : String(v ?? 0)) },
              { key: 'taux', label: 'Taux', align: 'right', render: (v) => tauxBadge(Number(v ?? 0)) },
              ...(canMutate
                ? [{ key: '__del', label: '', render: (_v: unknown, row: Row) => (
                    <RowDeleteButton path="/objectifs" id={String((row as { id: string }).id)} confirmLabel="Supprimer cet objectif ?" onDone={refetch} />
                  ) }]
                : []),
            ]}
          />
        </div>
      </Card>

      <Modal isOpen={open} onClose={() => !submitting && setOpen(false)} title="Nouvel objectif">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <FieldLabel>Cible</FieldLabel>
            <select value={pdvId} onChange={(e) => setPdvId(e.target.value)} className={inputCls}>
              <option value="">Distributeur (global)</option>
              {(pdvs ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.raisonSociale}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Type d'objectif</FieldLabel>
              <select value={typeObjectif} onChange={(e) => setTypeObjectif(e.target.value)} className={inputCls}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Période (AAAA-MM)</FieldLabel>
              <input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <FieldLabel>Cible {typeObjectif === 'CA' ? '(FCFA)' : '(nombre)'}</FieldLabel>
            <input type="number" value={cible === 0 ? '' : cible} onChange={(e) => setCible(Number(e.target.value) || 0)} placeholder="0" className={inputCls} />
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
