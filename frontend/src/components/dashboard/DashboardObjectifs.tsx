import { useEffect, useState } from 'react'
import { objectifsSuivi, type ObjSuiviPdv, type ObjSuiviSecteur } from '../../lib/api'

const roColor = (n: number) => (n >= 75 ? 'var(--primary)' : n >= 40 ? 'var(--gold-dark)' : 'var(--danger)')

function Table({ title, label, rows }: {
  title: string
  label: string
  rows: { name: string; objectif: number; realise: number; ro: number; reste: number }[]
}) {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="px-4 py-3 font-bold" style={{ color: 'var(--text)' }}>{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-y" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <th className="px-4 py-2">{label}</th>
              <th className="px-2 py-2 text-right">Objectif</th>
              <th className="px-2 py-2 text-right">Réalisé</th>
              <th className="px-2 py-2 text-right">R/O</th>
              <th className="px-4 py-2 text-right">Reste</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center" style={{ color: 'var(--text-muted)' }}>Aucun objectif saisi — renseignez-les dans Paramétrage</td></tr>
            ) : rows.map((r) => (
              <tr key={r.name} className="border-b" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-2" style={{ color: 'var(--text)' }}>{r.name}</td>
                <td className="px-2 py-2 text-right font-mono" style={{ color: 'var(--text)' }}>{r.objectif || '—'}</td>
                <td className="px-2 py-2 text-right font-mono" style={{ color: 'var(--text)' }}>{r.realise}</td>
                <td className="px-2 py-2 text-right font-mono font-bold" style={{ color: r.objectif > 0 ? roColor(r.ro) : 'var(--text-muted)' }}>{r.objectif > 0 ? `${r.ro} %` : '—'}</td>
                <td className="px-4 py-2 text-right font-mono" style={{ color: 'var(--text)' }}>{r.objectif > 0 ? r.reste : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DashboardObjectifs() {
  const [pdvs, setPdvs] = useState<ObjSuiviPdv[]>([])
  const [secteurs, setSecteurs] = useState<ObjSuiviSecteur[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    objectifsSuivi().then((d) => { if (!cancelled) { setPdvs(d.pdvs); setSecteurs(d.secteurs); setLoaded(true) } }).catch(() => setLoaded(true))
    return () => { cancelled = true }
  }, [])

  // On n'affiche le bloc que s'il y a quelque chose à montrer (pas de bloc vide inutile).
  if (loaded && pdvs.length === 0 && secteurs.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-base font-black" style={{ color: 'var(--text)' }}>Suivi des objectifs de recrutement — ce mois</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Table title="Par secteur" label="Secteur" rows={secteurs.map((s) => ({ name: s.secteur, objectif: s.objectif, realise: s.realise, ro: s.ro, reste: s.reste }))} />
        <Table title="Par point de vente" label="PDV" rows={pdvs.map((p) => ({ name: p.pdv, objectif: p.objectif, realise: p.realise, ro: p.ro, reste: p.reste }))} />
      </div>
    </div>
  )
}
