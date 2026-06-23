import { useCallback, useEffect, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { DataTable } from '../../components/ui/DataTable'
import { RowDeleteButton } from '../../components/ui/RowDeleteButton'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { useResource } from '../../hooks/useResource'
import { formatDate } from '../../lib/utils'
import {
  bddGlobale,
  createAbonne,
  updateAbonne,
  type BddAbonneRow,
  type AbonneInput,
} from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

const STATUT_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  ACTIF: 'success',
  ECHU: 'danger',
  SUSPENDU: 'warning',
  RESILIE: 'neutral',
}

const MUT = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VENDEUR']
const STATUTS = ['ACTIF', 'ECHU', 'SUSPENDU', 'RESILIE']

interface FormuleLite { id: string; code: string; nomCommercial: string }
interface PdvLite { id: string; raisonSociale: string }

const emptyForm: AbonneInput = {
  numAbonne: '', nom: '', prenom: '', tel1: '', tel2: '',
  formuleId: '', pdvId: '', dateEcheance: '', statut: 'ACTIF',
}

export default function BddGlobalePage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT.includes(role) : false

  const { data: formules } = useResource<FormuleLite>('/formules')
  const { data: pdvs } = useResource<PdvLite>('/pdvs')

  const [rows, setRows] = useState<BddAbonneRow[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await bddGlobale())
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

  // ----- Create / Edit -----
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<AbonneInput>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const set = (k: keyof AbonneInput, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const openCreate = () => {
    setEditId(null)
    setForm({ ...emptyForm, formuleId: formules[0]?.id ?? '', pdvId: pdvs[0]?.id ?? '' })
    setOpen(true)
  }

  const openEdit = (r: Row) => {
    if (!canMutate) return
    const row = r as unknown as BddAbonneRow
    setEditId(row.id)
    // La liste ne renvoie que des libellés ; on retrouve les IDs via les selects.
    const f = formules.find((x) => `${x.code}` === row.formule || x.nomCommercial === row.formule)
    const p = pdvs.find((x) => x.raisonSociale === row.pdv)
    const [prenom, ...rest] = (row.client || '').split(' ')
    setForm({
      numAbonne: row.numAbonne,
      nom: rest.join(' ') || row.client,
      prenom: prenom || '',
      tel1: row.tel1,
      tel2: '',
      formuleId: f?.id ?? formules[0]?.id ?? '',
      pdvId: p?.id ?? pdvs[0]?.id ?? '',
      dateEcheance: row.dateEcheance ? row.dateEcheance.slice(0, 10) : '',
      statut: row.statut,
    })
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nom.trim() || !form.prenom.trim()) { toast.error('Nom et prénom requis'); return }
    if (!form.tel1.trim()) { toast.error('Téléphone requis'); return }
    if (!form.formuleId) { toast.error('Choisissez une formule'); return }
    if (!form.pdvId) { toast.error('Choisissez un PDV'); return }
    setSubmitting(true)
    try {
      if (editId) {
        await updateAbonne(editId, form)
        toast.success('Abonné modifié ✓')
      } else {
        await createAbonne(form)
        toast.success('Abonné créé ✓')
      }
      setOpen(false)
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
        <PageHeader title="Base de données globale" subtitle="Tous les abonnés du réseau" />
        {canMutate && <Button variant="primary" onClick={openCreate}>+ Nouvel abonné</Button>}
      </div>

      <Card>
        <div className="min-h-[420px]">
          <DataTable<Row>
            loading={loading}
            rows={rows as unknown as Row[]}
            searchable
            pageSize={25}
            exportTitle="Base de données globale"
            onRowClick={canMutate ? openEdit : undefined}
            emptyMessage="Aucun abonné — cliquez sur « Nouvel abonné » pour commencer"
            columns={[
              { key: 'numAbonne', label: 'N° Abonné' },
              { key: 'client', label: 'Nom & Prénom' },
              { key: 'tel1', label: 'Téléphone' },
              { key: 'formule', label: 'Formule' },
              { key: 'pdv', label: 'PDV' },
              { key: 'dateEcheance', label: 'Échéance', render: (v) => (v ? formatDate(String(v)) : '—') },
              { key: 'statut', label: 'Statut', render: (v) => <Badge variant={STATUT_VARIANT[String(v)] ?? 'neutral'}>{String(v)}</Badge> },
              ...(canMutate ? [{ key: '__del', label: '', render: (_v: unknown, r: Row) => (
                <RowDeleteButton path="/abonnes" id={String((r as { id: string }).id)} confirmLabel="Résilier cet abonné ?" onDone={refetch} />
              ) }] : []),
            ]}
          />
        </div>
      </Card>

      <Modal isOpen={open} onClose={() => !submitting && setOpen(false)} title={editId ? 'Modifier l’abonné' : 'Nouvel abonné'} size="lg">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>N° Abonné <span className="text-app-subtle">(laisser vide = auto)</span></FieldLabel>
              <input value={form.numAbonne} onChange={(e) => set('numAbonne', e.target.value)} className={inputCls} placeholder="ex. 12345678" />
            </div>
            <div>
              <FieldLabel>Statut</FieldLabel>
              <select value={form.statut} onChange={(e) => set('statut', e.target.value)} className={inputCls}>
                {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><FieldLabel>Prénom</FieldLabel><input value={form.prenom} onChange={(e) => set('prenom', e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>Nom</FieldLabel><input value={form.nom} onChange={(e) => set('nom', e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>Téléphone</FieldLabel><input value={form.tel1} onChange={(e) => set('tel1', e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>Téléphone 2 <span className="text-app-subtle">(optionnel)</span></FieldLabel><input value={form.tel2} onChange={(e) => set('tel2', e.target.value)} className={inputCls} /></div>
            <div>
              <FieldLabel>Formule</FieldLabel>
              <select value={form.formuleId} onChange={(e) => set('formuleId', e.target.value)} className={inputCls}>
                <option value="">— Choisir —</option>
                {formules.map((f) => <option key={f.id} value={f.id}>{f.code} — {f.nomCommercial}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Point de vente</FieldLabel>
              <select value={form.pdvId} onChange={(e) => set('pdvId', e.target.value)} className={inputCls}>
                <option value="">— Choisir —</option>
                {pdvs.map((p) => <option key={p.id} value={p.id}>{p.raisonSociale}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Date d’échéance <span className="text-app-subtle">(optionnel)</span></FieldLabel>
              <input type="date" value={form.dateEcheance} onChange={(e) => set('dateEcheance', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>Annuler</Button>
            <Button type="submit" variant="primary" loading={submitting}>{editId ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
