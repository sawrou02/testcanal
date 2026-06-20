import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { formatFCFA, formatDate } from '../../lib/utils'
import { vadAgents, vadVentes, vadVenteKit, type VadAgentRow, type VenteKitRow } from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

const MUT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LOGISTICIEN']
const TYPES = ['Z4', 'GLOBAZ', 'G11']

export default function VenteKitPage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT_ROLES.includes(role) : false

  const [rows, setRows] = useState<VenteKitRow[]>([])
  const [agents, setAgents] = useState<VadAgentRow[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const [v, a] = await Promise.all([vadVentes(), vadAgents()])
      setRows(v)
      setAgents(a)
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
  const [decodeurType, setDecodeurType] = useState('Z4')
  const [clientNom, setClientNom] = useState('')
  const [montant, setMontant] = useState(0)

  const openModal = () => {
    setVadPdvId(agents[0]?.id ?? '')
    setDecodeurType('Z4')
    setClientNom('')
    setMontant(0)
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vadPdvId || !clientNom.trim() || montant <= 0) {
      toast.error('Agent, client et montant requis')
      return
    }
    setSubmitting(true)
    try {
      await vadVenteKit({ vadPdvId, decodeurType, clientNom: clientNom.trim(), montant })
      toast.success('Vente kit enregistrée ✓')
      setOpen(false)
      void refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Erreur lors de la vente')
    } finally {
      setSubmitting(false)
    }
  }

  const totalsRow = useMemo<Partial<Row>>(
    () => ({ date: 'TOTAL', montant: rows.reduce((a, r) => a + Number(r.montant ?? 0), 0) }),
    [rows],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Vente Kit" subtitle="Ventes de kits par les agents VAD" />
        {canMutate && <Button variant="primary" onClick={openModal}>+ Nouvelle vente kit</Button>}
      </div>

      <Card>
        <div className="min-h-[420px]">
          <DataTable<Row>
            loading={loading}
            rows={rows as unknown as Row[]}
            totalsRow={totalsRow}
            searchable
            emptyMessage="Aucune vente kit"
            columns={[
              { key: 'date', label: 'Date', render: (v) => (String(v) === 'TOTAL' ? 'TOTAL' : v ? formatDate(String(v)) : '—') },
              { key: 'vadPdv', label: 'Agent VAD', render: (_v, row) => (row as unknown as VenteKitRow).vadPdv?.raisonSociale ?? '—' },
              { key: 'decodeurType', label: 'Type', render: (v) => (v ? <Badge variant="neutral">{String(v)}</Badge> : '') },
              { key: 'clientNom', label: 'Client' },
              { key: 'montant', label: 'Montant', align: 'right', render: (v) => formatFCFA(Number(v ?? 0)) },
            ]}
          />
        </div>
      </Card>

      <Modal isOpen={open} onClose={() => !submitting && setOpen(false)} title="Nouvelle vente kit">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <FieldLabel>Agent VAD</FieldLabel>
            <select value={vadPdvId} onChange={(e) => setVadPdvId(e.target.value)} className={inputCls}>
              {agents.map((a) => (<option key={a.id} value={a.id}>{a.raisonSociale} (stock: {a.stockDecodeurs})</option>))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Type de décodeur</FieldLabel>
              <select value={decodeurType} onChange={(e) => setDecodeurType(e.target.value)} className={inputCls}>
                {TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div>
              <FieldLabel>Montant (FCFA)</FieldLabel>
              <input type="number" value={montant === 0 ? '' : montant} onChange={(e) => setMontant(Number(e.target.value) || 0)} className={inputCls} />
            </div>
          </div>
          <div>
            <FieldLabel>Nom du client</FieldLabel>
            <input value={clientNom} onChange={(e) => setClientNom(e.target.value)} className={inputCls} />
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
