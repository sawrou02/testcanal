import { useCallback, useEffect, useState } from 'react'
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
import { formatDate } from '../../lib/utils'
import {
  listInstallations,
  installationStats,
  createInstallation,
  updateInstallation,
  type InstallationRow,
  type InstallationStats,
} from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

const MUT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LOGISTICIEN']
interface PdvLite { id: string; raisonSociale: string }

function statutBadge(s: string) {
  if (s === 'INSTALLEE') return <Badge variant="success">{s}</Badge>
  if (s === 'ANNULEE') return <Badge variant="danger">{s}</Badge>
  return <Badge variant="warning">{s}</Badge>
}

export default function InstallationsPage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT_ROLES.includes(role) : false
  const { data: pdvs } = useResource<PdvLite>('/pdvs')

  const [rows, setRows] = useState<InstallationRow[]>([])
  const [stats, setStats] = useState<InstallationStats | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const [r, s] = await Promise.all([listInstallations(), installationStats()])
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
  const [pdvId, setPdvId] = useState('')
  const [clientNom, setClientNom] = useState('')
  const [technicien, setTechnicien] = useState('')

  const openModal = () => {
    setPdvId(pdvs?.[0]?.id ?? '')
    setClientNom('')
    setTechnicien('')
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pdvId || !clientNom.trim() || !technicien.trim()) {
      toast.error('Tous les champs sont requis')
      return
    }
    setSubmitting(true)
    try {
      await createInstallation({ pdvId, clientNom: clientNom.trim(), technicien: technicien.trim() })
      toast.success('Demande enregistrée ✓')
      setOpen(false)
      void refetch()
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  const markInstalled = async (id: string) => {
    try {
      await updateInstallation(id, { statut: 'INSTALLEE' })
      toast.success('Installation confirmée ✓')
      void refetch()
    } catch {
      toast.error('Erreur')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Suivi installation" subtitle="Demandes et installations terrain" />
        {canMutate && <Button variant="primary" onClick={openModal}>+ Nouvelle demande</Button>}
      </div>

      <div className="min-h-[7.5rem]">
        {loading || !stats ? (
          <SkeletonCardGrid count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Demandées" value={String(stats.demandees)} delta={0} deltaLabel="en attente" color="gold" />
            <KpiCard label="Installées" value={String(stats.installees)} delta={0} deltaLabel="terminées" color="green" />
            <KpiCard label="Total" value={String(stats.total)} delta={0} deltaLabel="demandes" color="blue" />
            <KpiCard label="Taux d'installation" value={`${stats.taux} %`} delta={0} deltaLabel="global" color="green" />
          </div>
        )}
      </div>

      <Card>
        <div className="min-h-[420px]">
          <DataTable<Row>
            loading={loading}
            rows={rows as unknown as Row[]}
            searchable
            emptyMessage="Aucune installation"
            columns={[
              { key: 'clientNom', label: 'Client' },
              { key: 'pdv', label: 'PDV', render: (_v, row) => (row as unknown as InstallationRow).pdv?.raisonSociale ?? '—' },
              { key: 'technicien', label: 'Technicien' },
              { key: 'dateDemande', label: 'Demandé le', render: (v) => (v ? formatDate(String(v)) : '—') },
              { key: 'dateInstallation', label: 'Installé le', render: (v) => (v ? formatDate(String(v)) : '—') },
              { key: 'statut', label: 'Statut', render: (v) => statutBadge(String(v)) },
              ...(canMutate
                ? [{
                    key: 'actions',
                    label: '',
                    render: (_v: unknown, row: Row) => {
                      const r = row as unknown as InstallationRow
                      return (
                        <div className="flex items-center justify-end gap-1">
                          {r.statut === 'DEMANDEE' && (
                            <Button variant="secondary" onClick={() => markInstalled(r.id)}>Marquer installé</Button>
                          )}
                          <RowDeleteButton path="/installations" id={r.id} confirmLabel="Supprimer cette installation ?" onDone={refetch} />
                        </div>
                      )
                    },
                  }]
                : []),
            ]}
          />
        </div>
      </Card>

      <Modal isOpen={open} onClose={() => !submitting && setOpen(false)} title="Nouvelle demande d'installation">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <FieldLabel>PDV</FieldLabel>
            <select value={pdvId} onChange={(e) => setPdvId(e.target.value)} className={inputCls}>
              {(pdvs ?? []).map((p) => (<option key={p.id} value={p.id}>{p.raisonSociale}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><FieldLabel>Client</FieldLabel><input value={clientNom} onChange={(e) => setClientNom(e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>Technicien</FieldLabel><input value={technicien} onChange={(e) => setTechnicien(e.target.value)} className={inputCls} /></div>
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
