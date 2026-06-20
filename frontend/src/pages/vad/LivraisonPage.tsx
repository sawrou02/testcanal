import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { vadAgents, vadLivraison, type VadAgentRow } from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

const MUT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LOGISTICIEN']
const TYPES = ['Z4', 'GLOBAZ', 'G11']

export default function LivraisonPage({ title }: { title?: string }) {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT_ROLES.includes(role) : false

  const [agents, setAgents] = useState<VadAgentRow[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      setAgents(await vadAgents())
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
  const [vadPdvId, setVadPdvId] = useState('')
  const [type, setType] = useState('Z4')
  const [quantite, setQuantite] = useState(0)

  const openModal = () => {
    setVadPdvId(agents[0]?.id ?? '')
    setType('Z4')
    setQuantite(0)
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vadPdvId || quantite <= 0) {
      toast.error('Agent et quantité requis')
      return
    }
    setSubmitting(true)
    try {
      const r = await vadLivraison({ vadPdvId, type, quantite })
      toast.success(`${r.livres} décodeur(s) attribué(s) ✓`)
      setOpen(false)
      void refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Erreur lors de la livraison')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title={title ?? 'Livraison stock VAD'} subtitle="Attribuer des décodeurs aux agents VAD" />
        {canMutate && <Button variant="primary" onClick={openModal}>+ Attribuer du stock</Button>}
      </div>

      <Card>
        <div className="min-h-[420px]">
          <DataTable<Row>
            loading={loading}
            rows={agents as unknown as Row[]}
            searchable
            emptyMessage="Aucun agent VAD"
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'raisonSociale', label: 'Agent' },
              { key: 'secteur', label: 'Secteur' },
              { key: 'stockDecodeurs', label: 'Stock actuel', align: 'right' },
            ]}
          />
        </div>
      </Card>

      <Modal isOpen={open} onClose={() => !submitting && setOpen(false)} title="Attribuer du stock VAD">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <FieldLabel>Agent VAD</FieldLabel>
            <select value={vadPdvId} onChange={(e) => setVadPdvId(e.target.value)} className={inputCls}>
              {agents.map((a) => (<option key={a.id} value={a.id}>{a.raisonSociale}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Type de décodeur</FieldLabel>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                {TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div>
              <FieldLabel>Quantité</FieldLabel>
              <input type="number" value={quantite === 0 ? '' : quantite} onChange={(e) => setQuantite(Number(e.target.value) || 0)} className={inputCls} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>Annuler</Button>
            <Button type="submit" variant="primary" loading={submitting}>Attribuer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
