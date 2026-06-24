import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { RowDeleteButton } from '../../components/ui/RowDeleteButton'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { useResource } from '../../hooks/useResource'
import { listObjPdv, createObjPdv, importObjPdv, type ObjPdvRow } from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

const MUT = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
const TYPES = ['RECRUTEMENT', 'REABONNEMENT']
const now = new Date()
interface PdvLite { id: string; code: string; raisonSociale: string }

export default function ObjectifsPdvPage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT.includes(role) : false
  const { data: pdvs } = useResource<PdvLite>('/pdvs')

  const [rows, setRows] = useState<ObjPdvRow[]>([])
  const [loading, setLoading] = useState(true)
  const refetch = useCallback(async () => {
    setLoading(true)
    try { setRows(await listObjPdv()) } catch { toast.error('Erreur de chargement') } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { void refetch() }, [refetch])

  const [f, setF] = useState({ pdvId: '', annee: now.getFullYear(), mois: now.getMonth() + 1, typeObjectif: 'RECRUTEMENT', effectif: '' })
  const [saving, setSaving] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.pdvId) { toast.error('Choisir un PDV'); return }
    if (!f.effectif) { toast.error('Saisir un effectif'); return }
    setSaving(true)
    try {
      await createObjPdv({ pdvId: f.pdvId, annee: Number(f.annee), mois: Number(f.mois), typeObjectif: f.typeObjectif, effectif: Number(f.effectif) })
      toast.success('Objectif enregistré ✓')
      setF({ ...f, effectif: '' })
      void refetch()
    } catch { toast.error("Erreur lors de l'enregistrement") } finally { setSaving(false) }
  }

  // ---- Import CSV : colonnes code_pdv,annee,mois,type,effectif ----
  const fileRef = useRef<HTMLInputElement>(null)
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const byCode = new Map((pdvs ?? []).map((p) => [p.code.toUpperCase(), p.id]))
      const items: { pdvId: string; annee: number; mois: number; typeObjectif: string; effectif: number }[] = []
      for (const line of text.split(/\r?\n/)) {
        const cols = line.split(/[,;]/).map((c) => c.trim())
        if (cols.length < 5) continue
        if (/code/i.test(cols[0])) continue // entête
        const pdvId = byCode.get(cols[0].toUpperCase())
        const effectif = Number(cols[4])
        if (!pdvId || isNaN(effectif)) continue
        items.push({ pdvId, annee: Number(cols[1]), mois: Number(cols[2]), typeObjectif: (cols[3] || 'RECRUTEMENT').toUpperCase(), effectif })
      }
      if (items.length === 0) { toast.error('Aucune ligne valide (format: code_pdv,annee,mois,type,effectif)'); return }
      const res = await importObjPdv(items)
      toast.success(`${res.imported} objectif(s) importé(s) ✓`)
      void refetch()
    } catch { toast.error("Erreur lors de l'import") } finally { if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Objectifs par PDV" subtitle="Objectifs mensuels par point de vente" />
        {canMutate && (
          <div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>Importer CSV</Button>
          </div>
        )}
      </div>

      {canMutate && (
        <Card>
          <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <div className="col-span-2 sm:col-span-1"><FieldLabel>PDV</FieldLabel>
              <select value={f.pdvId} onChange={(e) => setF({ ...f, pdvId: e.target.value })} className={inputCls}>
                <option value="">— Choisir —</option>
                {(pdvs ?? []).map((p) => <option key={p.id} value={p.id}>{p.raisonSociale}</option>)}
              </select>
            </div>
            <div><FieldLabel>Année</FieldLabel><input type="number" value={f.annee} onChange={(e) => setF({ ...f, annee: Number(e.target.value) })} className={inputCls} /></div>
            <div><FieldLabel>Mois</FieldLabel>
              <select value={f.mois} onChange={(e) => setF({ ...f, mois: Number(e.target.value) })} className={inputCls}>
                {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </select>
            </div>
            <div><FieldLabel>Type</FieldLabel>
              <select value={f.typeObjectif} onChange={(e) => setF({ ...f, typeObjectif: e.target.value })} className={inputCls}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><FieldLabel>Effectif</FieldLabel><input type="number" value={f.effectif} onChange={(e) => setF({ ...f, effectif: e.target.value })} className={inputCls} /></div>
            <div className="col-span-2 sm:col-span-5 flex justify-end">
              <Button type="submit" variant="primary" loading={saving}>Ajouter l’objectif</Button>
            </div>
          </form>
          <p className="text-xs text-app-muted mt-2">Import CSV — colonnes : <span className="font-mono">code_pdv, annee, mois, type, effectif</span></p>
        </Card>
      )}

      <Card>
        <div className="min-h-[320px]">
          <DataTable<Row>
            loading={loading}
            rows={rows as unknown as Row[]}
            searchable
            exportTitle="Objectifs PDV"
            emptyMessage="Aucun objectif enregistré"
            columns={[
              { key: 'pdv', label: 'PDV', render: (_v, r) => (r as unknown as ObjPdvRow).pdv?.raisonSociale ?? '—' },
              { key: 'annee', label: 'Année' },
              { key: 'mois', label: 'Mois' },
              { key: 'typeObjectif', label: 'Type' },
              { key: 'effectif', label: 'Effectif', align: 'right' },
              ...(canMutate ? [{ key: '__del', label: '', render: (_v: unknown, r: Row) => (
                <RowDeleteButton path="/objectifs-pdv" id={String((r as { id: string }).id)} confirmLabel="Supprimer cet objectif ?" onDone={refetch} />
              ) }] : []),
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
