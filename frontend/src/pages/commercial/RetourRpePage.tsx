import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { DataTable } from '../../components/ui/DataTable'
import { RowDeleteButton } from '../../components/ui/RowDeleteButton'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { formatDate } from '../../lib/utils'
import { listRetourRpe, createRetourRpe, updateRetourRpe, type RetourRpeRow } from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

const MUT = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMMERCIAL']
const OPT = {
  joint: ['', 'Joint', 'Non joint', 'Injoignable'],
  installation: ['', 'Installé', 'Non installé', 'En attente'],
  satisfaction: ['', 'Satisfait', 'Moyen', 'Insatisfait'],
  ouiNon: ['', 'Oui', 'Non'],
  statut: ['EN_COURS', 'TRAITE'],
}

export default function RetourRpePage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT.includes(role) : false

  const [rows, setRows] = useState<RetourRpeRow[]>([])
  const [loading, setLoading] = useState(true)
  const refetch = useCallback(async () => {
    setLoading(true)
    try { setRows(await listRetourRpe()) } catch { toast.error('Erreur de chargement') } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { void refetch() }, [refetch])

  // create
  const [cOpen, setCOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [c, setC] = useState({ numAbonne: '', nom: '', prenom: '', tel: '', formule: '', pdv: '', agent: '' })
  const openCreate = () => { setC({ numAbonne: '', nom: '', prenom: '', tel: '', formule: '', pdv: '', agent: '' }); setCOpen(true) }
  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!c.numAbonne.trim() || !c.nom.trim()) { toast.error('N° abonné et nom requis'); return }
    setSubmitting(true)
    try { await createRetourRpe(c); toast.success('Fiche créée ✓'); setCOpen(false); void refetch() }
    catch { toast.error("Erreur lors de la création") } finally { setSubmitting(false) }
  }

  // edit (the RPE dropdowns)
  const [eOpen, setEOpen] = useState(false)
  const [edit, setEdit] = useState<RetourRpeRow | null>(null)
  const openEdit = (r: Row) => { if (!canMutate) return; setEdit({ ...(r as unknown as RetourRpeRow) }); setEOpen(true) }
  const setE = (k: keyof RetourRpeRow, v: unknown) => setEdit((p) => (p ? { ...p, [k]: v } : p))
  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!edit) return
    setSubmitting(true)
    try {
      await updateRetourRpe(edit.id, {
        joint: edit.joint, installation: edit.installation, satisfaction: edit.satisfaction,
        mycanal: edit.mycanal, netflix: edit.netflix, progrFidel: edit.progrFidel,
        score: edit.score, commentaire: edit.commentaire, statut: edit.statut,
      })
      toast.success('Retour enregistré ✓'); setEOpen(false); void refetch()
    } catch { toast.error("Erreur lors de l'enregistrement") } finally { setSubmitting(false) }
  }

  const Sel = ({ label, k, opts }: { label: string; k: keyof RetourRpeRow; opts: string[] }) => (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select value={String(edit?.[k] ?? '')} onChange={(ev) => setE(k, ev.target.value)} className={inputCls}>
        {opts.map((o) => <option key={o} value={o}>{o === '' ? '—' : o}</option>)}
      </select>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Retour client RPE" subtitle="Suivi qualité des appels et de la satisfaction client" />
        {canMutate && <Button variant="primary" onClick={openCreate}>+ Nouvelle fiche</Button>}
      </div>

      <Card>
        <div className="min-h-[420px]">
          <DataTable<Row>
            loading={loading}
            rows={rows as unknown as Row[]}
            searchable
            exportTitle="Retour client RPE"
            onRowClick={canMutate ? openEdit : undefined}
            emptyMessage="Aucune fiche RPE"
            columns={[
              { key: 'numAbonne', label: 'N° Abonné' },
              { key: 'nom', label: 'Nom', render: (_v, r) => `${(r as unknown as RetourRpeRow).nom} ${(r as unknown as RetourRpeRow).prenom ?? ''}` },
              { key: 'tel', label: 'Téléphone' },
              { key: 'formule', label: 'Formule' },
              { key: 'pdv', label: 'PDV / Agent' },
              { key: 'joint', label: 'Joint' },
              { key: 'satisfaction', label: 'Satisfaction' },
              { key: 'score', label: 'Score', align: 'right', render: (v) => (v == null ? '—' : `${v}/10`) },
              { key: 'statut', label: 'Statut', render: (v) => <Badge variant={String(v) === 'TRAITE' ? 'success' : 'warning'}>{String(v)}</Badge> },
              ...(canMutate ? [{ key: '__del', label: '', render: (_v: unknown, r: Row) => (
                <RowDeleteButton path="/retour-rpe" id={String((r as { id: string }).id)} confirmLabel="Supprimer cette fiche ?" onDone={refetch} />
              ) }] : []),
            ]}
          />
        </div>
      </Card>

      {/* Create */}
      <Modal isOpen={cOpen} onClose={() => !submitting && setCOpen(false)} title="Nouvelle fiche RPE">
        <form onSubmit={submitCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><FieldLabel>N° Abonné</FieldLabel><input value={c.numAbonne} onChange={(e) => setC({ ...c, numAbonne: e.target.value })} className={inputCls} /></div>
            <div><FieldLabel>Téléphone</FieldLabel><input value={c.tel} onChange={(e) => setC({ ...c, tel: e.target.value })} className={inputCls} /></div>
            <div><FieldLabel>Nom</FieldLabel><input value={c.nom} onChange={(e) => setC({ ...c, nom: e.target.value })} className={inputCls} /></div>
            <div><FieldLabel>Prénom</FieldLabel><input value={c.prenom} onChange={(e) => setC({ ...c, prenom: e.target.value })} className={inputCls} /></div>
            <div><FieldLabel>Formule</FieldLabel><input value={c.formule} onChange={(e) => setC({ ...c, formule: e.target.value })} className={inputCls} /></div>
            <div><FieldLabel>PDV</FieldLabel><input value={c.pdv} onChange={(e) => setC({ ...c, pdv: e.target.value })} className={inputCls} /></div>
            <div><FieldLabel>Agent</FieldLabel><input value={c.agent} onChange={(e) => setC({ ...c, agent: e.target.value })} className={inputCls} /></div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCOpen(false)} disabled={submitting}>Annuler</Button>
            <Button type="submit" variant="primary" loading={submitting}>Créer</Button>
          </div>
        </form>
      </Modal>

      {/* Edit RPE dropdowns */}
      <Modal isOpen={eOpen} onClose={() => !submitting && setEOpen(false)} title={`Retour RPE — ${edit?.numAbonne ?? ''}`} size="lg">
        {edit && (
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Sel label="Joint" k="joint" opts={OPT.joint} />
              <Sel label="Installation" k="installation" opts={OPT.installation} />
              <Sel label="Satisfaction" k="satisfaction" opts={OPT.satisfaction} />
              <Sel label="myCanal" k="mycanal" opts={OPT.ouiNon} />
              <Sel label="Netflix" k="netflix" opts={OPT.ouiNon} />
              <Sel label="Progr. fidélité" k="progrFidel" opts={OPT.ouiNon} />
              <div>
                <FieldLabel>Score /10</FieldLabel>
                <select value={String(edit.score ?? '')} onChange={(e) => setE('score', e.target.value === '' ? undefined : Number(e.target.value))} className={inputCls}>
                  <option value="">—</option>
                  {Array.from({ length: 11 }).map((_, i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <Sel label="Statut" k="statut" opts={OPT.statut} />
            </div>
            <div>
              <FieldLabel>Commentaire</FieldLabel>
              <textarea value={edit.commentaire ?? ''} onChange={(e) => setE('commentaire', e.target.value)} rows={3} className={inputCls} />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEOpen(false)} disabled={submitting}>Annuler</Button>
              <Button type="submit" variant="primary" loading={submitting}>Enregistrer</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
