import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { RowDeleteButton } from '../../components/ui/RowDeleteButton'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { useResource } from '../../hooks/useResource'
import { formatDate } from '../../lib/utils'
import { listParaboles, createParabole, type ParaboleRow } from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

const MUT = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LOGISTICIEN']
interface PdvLite { id: string; raisonSociale: string }
const empty = { pdvId: '', quantiteVendue: '', quantiteStock: '', technicien: '' }

export default function ParabolesPage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT.includes(role) : false
  const { data: pdvs } = useResource<PdvLite>('/pdvs')

  const [rows, setRows] = useState<ParaboleRow[]>([])
  const [loading, setLoading] = useState(true)
  const refetch = useCallback(async () => {
    setLoading(true)
    try { setRows(await listParaboles()) } catch { toast.error('Erreur de chargement') } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { void refetch() }, [refetch])

  const [f, setF] = useState(empty)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof empty, v: string) => setF((p) => ({ ...p, [k]: v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.pdvId) { toast.error('Choisir un PDV'); return }
    if (!f.quantiteVendue) { toast.error('Quantité vendue requise'); return }
    setSaving(true)
    try {
      await createParabole({ pdvId: f.pdvId, quantiteVendue: Number(f.quantiteVendue), quantiteStock: f.quantiteStock ? Number(f.quantiteStock) : 0, technicien: f.technicien || undefined })
      toast.success('Vente parabole enregistrée ✓'); setF({ ...empty, pdvId: f.pdvId }); void refetch()
    } catch { toast.error("Erreur lors de l'enregistrement") } finally { setSaving(false) }
  }

  const totalsRow = useMemo<Partial<Row>>(() => {
    const v = rows.reduce((s, r) => s + (r.quantiteVendue || 0), 0)
    const st = rows.reduce((s, r) => s + (r.quantiteStock || 0), 0)
    return { pdv: { raisonSociale: 'TOTAL' }, quantiteVendue: v, quantiteStock: st }
  }, [rows])

  return (
    <div className="space-y-4">
      <PageHeader title="Suivi Vente Paraboles" subtitle="Ventes et stock de paraboles par point de vente" />

      {canMutate && (
        <Card>
          <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div className="col-span-2 sm:col-span-1">
              <FieldLabel>PDV</FieldLabel>
              <select value={f.pdvId} onChange={(e) => set('pdvId', e.target.value)} className={inputCls}>
                <option value="">— Choisir —</option>
                {(pdvs ?? []).map((p) => <option key={p.id} value={p.id}>{p.raisonSociale}</option>)}
              </select>
            </div>
            <div><FieldLabel>Vendues</FieldLabel><input type="number" value={f.quantiteVendue} onChange={(e) => set('quantiteVendue', e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>En stock</FieldLabel><input type="number" value={f.quantiteStock} onChange={(e) => set('quantiteStock', e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>Technicien</FieldLabel><input value={f.technicien} onChange={(e) => set('technicien', e.target.value)} className={inputCls} /></div>
            <div className="col-span-2 sm:col-span-4 flex justify-end">
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
            totalsRow={totalsRow}
            searchable
            exportTitle="Suivi Vente Paraboles"
            emptyMessage="Aucune vente de parabole enregistrée"
            columns={[
              { key: 'date', label: 'Date', render: (v) => (String(v) ? formatDate(String(v)) : '—') },
              { key: 'pdv', label: 'PDV', render: (_v, r) => (r as unknown as ParaboleRow).pdv?.raisonSociale ?? '—' },
              { key: 'quantiteVendue', label: 'Vendues', align: 'right' },
              { key: 'quantiteStock', label: 'En stock', align: 'right' },
              { key: 'technicien', label: 'Technicien', render: (v) => (v ? String(v) : '—') },
              ...(canMutate ? [{ key: '__del', label: '', render: (_v: unknown, r: Row) => (
                <RowDeleteButton path="/paraboles" id={String((r as { id: string }).id)} confirmLabel="Supprimer cette ligne ?" onDone={refetch} />
              ) }] : []),
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
