import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { listBaremes, updateBaremes, type BaremeRow } from '../../lib/api'
import { Card, PageHeader, inputCls } from '../../components/ui/Section'

const MUT = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']

export default function BaremesPage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT.includes(role) : false

  const [rows, setRows] = useState<BaremeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    try { setRows(await listBaremes()) } catch { toast.error('Erreur de chargement') } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { void refetch() }, [refetch])

  const setVal = (id: string, valeur: number) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, valeur } : r)))
  const setActif = (id: string, actif: boolean) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, actif } : r)))

  const save = async () => {
    setSaving(true)
    try {
      await updateBaremes(rows.map((r) => ({ typeCommission: r.typeCommission, valeur: Number(r.valeur), unite: r.unite, actif: r.actif })))
      toast.success('Barèmes enregistrés ✓')
      void refetch()
    } catch { toast.error("Erreur lors de l'enregistrement") } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Barèmes de commission" subtitle="Valeurs utilisées pour calculer les commissions — modifiables sans redéploiement" />
      <Card>
        <div className="min-h-[300px]">
          {loading ? (
            <p className="text-sm text-app-muted py-8 text-center">Chargement…</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-app-border text-app-muted">
                  <th className="py-2">Commission</th>
                  <th className="py-2 w-40">Valeur</th>
                  <th className="py-2 w-24">Unité</th>
                  <th className="py-2 w-24">Actif</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-app-border/60">
                    <td className="py-3">
                      <div className="font-semibold text-app-text">{r.libelle || r.typeCommission}</div>
                      <div className="text-xs text-app-muted font-mono">{r.typeCommission}</div>
                    </td>
                    <td className="py-3">
                      <input type="number" value={r.valeur} disabled={!canMutate}
                        onChange={(e) => setVal(r.id, Number(e.target.value))} className={inputCls} />
                    </td>
                    <td className="py-3 text-app-text">{r.unite === '%' ? '% (du CA HT)' : 'F / abonné'}</td>
                    <td className="py-3">
                      <input type="checkbox" checked={r.actif} disabled={!canMutate}
                        onChange={(e) => setActif(r.id, e.target.checked)} className="w-4 h-4 accent-primary" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {canMutate && (
          <div className="flex justify-end pt-4">
            <Button variant="primary" onClick={save} loading={saving}>Sauvegarder</Button>
          </div>
        )}
      </Card>
      <p className="text-xs text-app-muted">
        Ces barèmes sont lus depuis la base à chaque calcul de commission. Modifier une valeur ici met à jour
        immédiatement tous les calculs, sans toucher au code.
      </p>
    </div>
  )
}
