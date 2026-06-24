import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { RowDeleteButton } from '../../components/ui/RowDeleteButton'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { listObjDist, createObjDist, type ObjDistRow } from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

const MUT = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
const TYPES = ['RECRUTEMENT', 'REABONNEMENT']
const now = new Date()

export default function ObjectifsDistributeurPage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT.includes(role) : false

  const [rows, setRows] = useState<ObjDistRow[]>([])
  const [loading, setLoading] = useState(true)
  const refetch = useCallback(async () => {
    setLoading(true)
    try { setRows(await listObjDist()) } catch { toast.error('Erreur de chargement') } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { void refetch() }, [refetch])

  const [f, setF] = useState({ annee: now.getFullYear(), trimestre: '', mois: '', formule: 'TOUTES', typeObjectif: 'RECRUTEMENT', effectif: '' })
  const [saving, setSaving] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.effectif) { toast.error('Saisir un effectif'); return }
    setSaving(true)
    try {
      await createObjDist({
        annee: Number(f.annee),
        trimestre: f.trimestre ? Number(f.trimestre) : null,
        mois: f.mois ? Number(f.mois) : null,
        formule: f.formule || 'TOUTES',
        typeObjectif: f.typeObjectif,
        effectif: Number(f.effectif),
      })
      toast.success('Objectif enregistré ✓')
      setF({ ...f, effectif: '' })
      void refetch()
    } catch { toast.error("Erreur lors de l'enregistrement") } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Objectifs Distributeur" subtitle="Objectifs globaux par an / trimestre / mois" />

      {canMutate && (
        <Card>
          <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
            <div><FieldLabel>Année</FieldLabel><input type="number" value={f.annee} onChange={(e) => setF({ ...f, annee: Number(e.target.value) })} className={inputCls} /></div>
            <div><FieldLabel>Trimestre</FieldLabel>
              <select value={f.trimestre} onChange={(e) => setF({ ...f, trimestre: e.target.value })} className={inputCls}>
                <option value="">—</option>{[1, 2, 3, 4].map((t) => <option key={t} value={t}>T{t}</option>)}
              </select>
            </div>
            <div><FieldLabel>Mois</FieldLabel>
              <select value={f.mois} onChange={(e) => setF({ ...f, mois: e.target.value })} className={inputCls}>
                <option value="">—</option>{Array.from({ length: 12 }).map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </select>
            </div>
            <div><FieldLabel>Formule</FieldLabel><input value={f.formule} onChange={(e) => setF({ ...f, formule: e.target.value })} className={inputCls} /></div>
            <div><FieldLabel>Type</FieldLabel>
              <select value={f.typeObjectif} onChange={(e) => setF({ ...f, typeObjectif: e.target.value })} className={inputCls}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><FieldLabel>Effectif</FieldLabel><input type="number" value={f.effectif} onChange={(e) => setF({ ...f, effectif: e.target.value })} className={inputCls} /></div>
            <div className="col-span-2 sm:col-span-6 flex justify-end">
              <Button type="submit" variant="primary" loading={saving}>Ajouter l’objectif</Button>
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
            exportTitle="Objectifs Distributeur"
            emptyMessage="Aucun objectif enregistré"
            columns={[
              { key: 'annee', label: 'Année' },
              { key: 'trimestre', label: 'Trimestre', render: (v) => (v ? `T${v}` : '—') },
              { key: 'mois', label: 'Mois', render: (v) => (v ? String(v) : '—') },
              { key: 'formule', label: 'Formule' },
              { key: 'typeObjectif', label: 'Type' },
              { key: 'effectif', label: 'Effectif', align: 'right' },
              ...(canMutate ? [{ key: '__del', label: '', render: (_v: unknown, r: Row) => (
                <RowDeleteButton path="/objectifs-distributeur" id={String((r as { id: string }).id)} confirmLabel="Supprimer cet objectif ?" onDone={refetch} />
              ) }] : []),
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
