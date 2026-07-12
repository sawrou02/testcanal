import { useEffect, useState } from 'react'
import { getSynthese, type SyntheseData } from '../../lib/api'
import { formatFCFA } from '../../lib/utils'
import { t } from '../../lib/locale'
import { Icon } from '../ui/Icon'

interface Block {
  title: string
  icon: string
  header: string // bg tint
  iconColor: string
  lines: { label: string; value: string; sub?: string; valueColor?: string }[]
}

function Line({ label, value, sub, valueColor }: { label: string; value: string; sub?: string; valueColor?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5 border-b border-app-border last:border-0" style={{ borderColor: 'var(--border)' }}>
      <div className="min-w-0">
        <div className="text-sm text-app-text" style={{ color: 'var(--text)' }}>{t(label)}</div>
        {sub && <div className="text-[11px] text-app-subtle" style={{ color: 'var(--text-muted)' }}>{t(sub)}</div>}
      </div>
      <div className="text-sm font-bold font-mono shrink-0" style={{ color: valueColor || 'var(--text)', fontFamily: 'IBM Plex Mono, monospace' }}>{value}</div>
    </div>
  )
}

/** Couleur selon le taux d'atteinte (R/O ou atterrissage). */
function pctColor(p: number): string {
  return p >= 75 ? 'var(--primary)' : p >= 40 ? 'var(--gold-dark)' : 'var(--danger)'
}

export function SyntheseCards() {
  const [data, setData] = useState<SyntheseData | null>(null)
  useEffect(() => {
    let cancelled = false
    getSynthese().then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 rounded-xl border border-app-border bg-white animate-pulse" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
        ))}
      </div>
    )
  }

  const blocks: Block[] = [
    {
      title: 'Recouvrement', icon: 'edit', header: 'rgba(210,58,44,0.10)', iconColor: '#D23A2C',
      lines: [
        { label: 'Crédit restant', value: formatFCFA(data.recouvrement.creditRestant) },
        { label: 'Avoir', value: formatFCFA(data.recouvrement.avoir) },
        { label: 'Encours', value: formatFCFA(data.recouvrement.encours) },
        { label: 'Comm. matériel', sub: 'par abonné', value: formatFCFA(data.recouvrement.commMateriel) },
        { label: 'Comm. formule', sub: '% CA HT', value: formatFCFA(data.recouvrement.commFormule) },
        { label: 'Comm. réabo', sub: '% CA HT', value: formatFCFA(data.recouvrement.commReabo) },
      ],
    },
    {
      title: 'Vente', icon: 'trend', header: 'rgba(14,138,79,0.10)', iconColor: '#0E8A4F',
      lines: [
        { label: 'NB ABO (recrutements)', value: String(data.vente.nbAbo) },
        { label: 'Objectif', value: data.vente.objectif > 0 ? String(data.vente.objectif) : '—' },
        { label: 'R / O', value: data.vente.objectif > 0 ? `${data.vente.ro} %` : '—', valueColor: data.vente.objectif > 0 ? pctColor(data.vente.ro) : undefined },
        { label: 'Reste à réaliser', value: data.vente.objectif > 0 ? String(data.vente.reste) : '—' },
        { label: 'Atterrissage', sub: 'projection fin de mois', value: data.vente.objectif > 0 ? `${data.vente.atterrissage} %` : '—', valueColor: data.vente.objectif > 0 ? pctColor(data.vente.atterrissage) : undefined },
        { label: 'CA recrutement', value: formatFCFA(data.vente.caRecru) },
        { label: 'NB migrations', value: String(data.vente.nbMigration) },
      ],
    },
    {
      title: 'Réabonnement', icon: 'users', header: 'rgba(43,108,176,0.10)', iconColor: '#2B6CB0',
      lines: [
        { label: 'Parc actif', value: String(data.reabo.parcActif) },
        { label: 'NB réabo (mois)', value: String(data.reabo.nbReabo) },
        { label: 'Objectif', value: data.reabo.objectif > 0 ? String(data.reabo.objectif) : '—' },
        { label: 'R / O', value: data.reabo.objectif > 0 ? `${data.reabo.ro} %` : '—', valueColor: data.reabo.objectif > 0 ? pctColor(data.reabo.ro) : undefined },
        { label: 'Reste à réaliser', value: data.reabo.objectif > 0 ? String(data.reabo.reste) : '—' },
        { label: 'CA réabo', value: formatFCFA(data.reabo.caReabo) },
        { label: 'Abonnés échus', value: String(data.reabo.echus) },
      ],
    },
    {
      title: 'Logistique', icon: 'package', header: 'rgba(226,160,0,0.12)', iconColor: '#8A5E00',
      lines: [
        { label: 'Stock Z4', value: String(data.logistique.z4Stock) },
        { label: 'Réseau Z4', value: String(data.logistique.z4Reseau) },
        { label: 'Défectueux Z4', value: String(data.logistique.z4Defectueux) },
        { label: 'Stock / Réseau GLOBAZ', value: `${data.logistique.globazStock} / ${data.logistique.globazReseau}` },
        { label: 'Stock / Réseau G11', value: `${data.logistique.g11Stock} / ${data.logistique.g11Reseau}` },
      ],
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {blocks.map((b) => (
        <div key={b.title} className="rounded-xl border border-app-border bg-white shadow-sm overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: b.header }}>
            <span style={{ color: b.iconColor }}><Icon name={b.icon} size={20} /></span>
            <span className="font-bold" style={{ color: b.iconColor }}>{t(b.title)}</span>
          </div>
          <div>{b.lines.map((l) => <Line key={l.label} {...l} />)}</div>
        </div>
      ))}
    </div>
  )
}
