import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { DataTable } from '../../components/ui/DataTable'
import { RowDeleteButton } from '../../components/ui/RowDeleteButton'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { useResource } from '../../hooks/useResource'
import { formatDate } from '../../lib/utils'
import { listGapKit, createGapKit, type GapKitRow } from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

const MUT = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LOGISTICIEN']
interface PdvLite { id: string; raisonSociale: string }
const empty = { pdvId: '', clientNom: '', numAbonne: '', kitVendu: '', elementsManquants: '', statut: 'EN_ATTENTE' }

export default function GapKitPage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT.includes(role) : false
  const { data: pdvs } = useResource<PdvLite>('/pdvs')

  const [rows, setRows] = useState<GapKitRow[]>([])
  const [loading, setLoading] = useState(true)
  const refetch = useCallback(async () => {
    setLoading(true)
    try { setRows(await listGapKit()) } catch { toast.error('Erreur de chargement') } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { void refetch() }, [refetch])

  const [f, setF] = useState(empty)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof empty, v: string) => setF((p) => ({ ...p, [k]: v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.pdvId) { toast.error('Choisir un PDV'); return }
    if (!f.kitVendu.trim() || !f.elementsManquants.trim()) { toast.error('Kit vendu et éléments manquants requis'); return }
    setSaving(true)
    try { await createGapKit(f); toast.success('Gap kit enregistré ✓'); setF({ ...empty, pdvId: f.pdvId }); void refetch() }
    catch { toast.error("Erreur lors de l'enregistrement") } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Gap Kit après vente" subtitle="Suivi des kits incomplets / éléments manquants après une vente" />

      {canMutate && (
        <Card>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <FieldLabel>PDV</FieldLabel>
              <select value={f.pdvId} onChange={(e) => set('pdvId', e.target.value)} className={inputCls}>
                <option value="">— Choisir —</option>
                {(pdvs ?? []).map((p) => <option key={p.id} value={p.id}>{p.raisonSociale}</option>)}
              </select>
            </div>
            <div><FieldLabel>Client (optionnel)</FieldLabel><input value={f.clientNom} onChange={(e) => set('clientNom', e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>N° Abonné (optionnel)</FieldLabel><input value={f.numAbonne} onChange={(e) => set('numAbonne', e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>Kit vendu</FieldLabel><input value={f.kitVendu} onChange={(e) => set('kitVendu', e.target.value)} className={inputCls} placeholder="ex. Kit complet Z4" /></div>
            <div className="sm:col-span-2"><FieldLabel>Éléments manquants</FieldLabel><input value={f.elementsManquants} onChange={(e) => set('elementsManquants', e.target.value)} className={inputCls} placeholder="ex. télécommande, câble HDMI" /></div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" variant="primary" loading={saving}>Enregistrer</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="min-h-[320px]">
          <DataTable<Row>
            loading={loading}
            rows={rows as unknown as Row[]}
            searchable
            exportTitle="Gap Kit après vente"
            emptyMessage="Aucun gap kit enregistré"
            columns={[
              { key: 'date', label: 'Date', render: (v) => (v ? formatDate(String(v)) : '—') },
              { key: 'pdv', label: 'PDV', render: (_v, r) => (r as unknown as GapKitRow).pdv?.raisonSociale ?? '—' },
              { key: 'clientNom', label: 'Client', render: (v) => (v ? String(v) : '—') },
              { key: 'kitVendu', label: 'Kit vendu' },
              { key: 'elementsManquants', label: 'Manquants' },
              { key: 'statut', label: 'Statut', render: (v) => <Badge variant={String(v) === 'REGULARISE' ? 'success' : 'warning'}>{String(v)}</Badge> },
              ...(canMutate ? [{ key: '__del', label: '', render: (_v: unknown, r: Row) => (
                <RowDeleteButton path="/gap-kit" id={String((r as { id: string }).id)} confirmLabel="Supprimer ce gap kit ?" onDone={refetch} />
              ) }] : []),
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
