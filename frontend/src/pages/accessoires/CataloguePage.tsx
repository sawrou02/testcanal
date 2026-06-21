import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { DataTable } from '../../components/ui/DataTable'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { RowDeleteButton } from '../../components/ui/RowDeleteButton'
import { useAuthStore } from '../../store/authStore'
import { formatFCFA } from '../../lib/utils'
import {
  listAccessoires,
  accessoiresStats,
  createAccessoire,
  approvisionnerAccessoire,
  type AccessoireRow,
  type AccessoiresStats,
} from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

const MUT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LOGISTICIEN']

interface Props {
  enableAppro?: boolean
  title?: string
}

export default function CataloguePage({ enableAppro = false, title }: Props) {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT_ROLES.includes(role) : false

  const [rows, setRows] = useState<AccessoireRow[]>([])
  const [stats, setStats] = useState<AccessoiresStats | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const [r, s] = await Promise.all([listAccessoires(), accessoiresStats()])
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

  // create accessoire
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [code, setCode] = useState('')
  const [nom, setNom] = useState('')
  const [prix, setPrix] = useState(0)
  const [stockEntrepot, setStockEntrepot] = useState(0)

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !nom.trim() || prix <= 0) {
      toast.error('Code, nom et prix requis')
      return
    }
    setSubmitting(true)
    try {
      await createAccessoire({ code: code.trim(), nom: nom.trim(), prixUnitaire: prix, stockEntrepot })
      toast.success('Accessoire créé ✓')
      setOpen(false)
      setCode(''); setNom(''); setPrix(0); setStockEntrepot(0)
      void refetch()
    } catch {
      toast.error('Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  // approvisionnement
  const [approOpen, setApproOpen] = useState(false)
  const [approTarget, setApproTarget] = useState<AccessoireRow | null>(null)
  const [approQte, setApproQte] = useState(0)

  const submitAppro = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!approTarget || approQte <= 0) return
    setSubmitting(true)
    try {
      await approvisionnerAccessoire({ accessoireId: approTarget.id, quantite: approQte })
      toast.success('Stock entrepôt mis à jour ✓')
      setApproOpen(false); setApproTarget(null); setApproQte(0)
      void refetch()
    } catch {
      toast.error("Erreur lors de l'approvisionnement")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title={title ?? 'Consultation stock Entrepôt'} subtitle="Catalogue des accessoires et stocks" />
        {canMutate && !enableAppro && (
          <Button variant="primary" onClick={() => setOpen(true)}>+ Nouvel accessoire</Button>
        )}
      </div>

      <div className="min-h-[7.5rem]">
        {loading || !stats ? (
          <SkeletonCardGrid count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Références" value={String(stats.nbAccessoires)} delta={0} deltaLabel="au catalogue" color="blue" />
            <KpiCard label="Stock entrepôt" value={String(stats.stockEntrepotTotal)} delta={0} deltaLabel="unités" color="green" />
            <KpiCard label="Ventes du mois" value={formatFCFA(stats.ventesMoisMontant)} delta={0} deltaLabel="mois en cours" color="gold" />
            <KpiCard label="Retours en attente" value={String(stats.retoursEnAttente)} delta={0} deltaLabel="à traiter" color="red" />
          </div>
        )}
      </div>

      <Card>
        <div className="min-h-[420px]">
          <DataTable<Row>
            loading={loading}
            rows={rows as unknown as Row[]}
            searchable
            emptyMessage="Aucun accessoire"
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'nom', label: 'Nom' },
              { key: 'prixUnitaire', label: 'Prix unitaire', align: 'right', render: (v) => formatFCFA(Number(v ?? 0)) },
              { key: 'stockEntrepot', label: 'Stock entrepôt', align: 'right' },
              { key: 'stockReseauTotal', label: 'Stock réseau', align: 'right' },
              { key: 'venduTotal', label: 'Vendus', align: 'right' },
              { key: 'statut', label: 'Statut', render: (v) => <Badge variant={String(v) === 'ACTIF' ? 'success' : 'neutral'}>{String(v ?? '—')}</Badge> },
              ...(canMutate
                ? [{
                    key: '__del',
                    label: '',
                    render: (_v: unknown, row: Row) => (
                      <RowDeleteButton path="/accessoires" id={String((row as { id: string }).id)} confirmLabel="Désactiver cet accessoire ?" onDone={refetch} />
                    ),
                  }]
                : []),
              ...(enableAppro && canMutate
                ? [{
                    key: 'actions',
                    label: '',
                    render: (_v: unknown, row: Row) => (
                      <Button
                        variant="secondary"
                        onClick={() => { setApproTarget(row as unknown as AccessoireRow); setApproQte(0); setApproOpen(true) }}
                      >
                        Approvisionner
                      </Button>
                    ),
                  }]
                : []),
            ]}
          />
        </div>
      </Card>

      <Modal isOpen={open} onClose={() => !submitting && setOpen(false)} title="Nouvel accessoire">
        <form onSubmit={submitCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><FieldLabel>Code</FieldLabel><input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>Nom</FieldLabel><input value={nom} onChange={(e) => setNom(e.target.value)} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><FieldLabel>Prix unitaire (FCFA)</FieldLabel><input type="number" value={prix === 0 ? '' : prix} onChange={(e) => setPrix(Number(e.target.value) || 0)} className={inputCls} /></div>
            <div><FieldLabel>Stock entrepôt initial</FieldLabel><input type="number" value={stockEntrepot === 0 ? '' : stockEntrepot} onChange={(e) => setStockEntrepot(Number(e.target.value) || 0)} className={inputCls} /></div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>Annuler</Button>
            <Button type="submit" variant="primary" loading={submitting}>Créer</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={approOpen} onClose={() => !submitting && setApproOpen(false)} title={`Approvisionner — ${approTarget?.nom ?? ''}`}>
        <form onSubmit={submitAppro} className="space-y-4">
          <div><FieldLabel>Quantité à ajouter</FieldLabel><input type="number" value={approQte === 0 ? '' : approQte} onChange={(e) => setApproQte(Number(e.target.value) || 0)} className={inputCls} /></div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setApproOpen(false)} disabled={submitting}>Annuler</Button>
            <Button type="submit" variant="primary" loading={submitting}>Approvisionner</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
