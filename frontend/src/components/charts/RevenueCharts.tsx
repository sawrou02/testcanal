import { useState } from 'react'
import { formatFCFA } from '../../lib/utils'

/** Couleurs de séries (palette validée daltonisme). */
export const SERIES = {
  recru: '#0E8A4F',
  reabo: '#2563EB',
  migration: '#E2A000',
  autre: '#7C3AED',
}

const compact = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)} M`
  if (a >= 1_000) return `${Math.round(n / 1_000)} k`
  return String(Math.round(n))
}

const MOIS_COURTS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']
/** Étiquette d'axe : "05/07" pour un jour (YYYY-MM-DD), "juil. 26" pour un mois (YYYY-MM). */
const axisLabel = (date: string) => {
  if (date.length <= 7) {
    const [y, m] = date.split('-')
    return `${MOIS_COURTS[Number(m) - 1]} ${y.slice(2)}`
  }
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`
}
/** Étiquette longue pour l'info-bulle. */
const fullLabel = (date: string) => {
  if (date.length <= 7) {
    const [y, m] = date.split('-')
    return `${MOIS_COURTS[Number(m) - 1]} ${y}`
  }
  return date.split('-').reverse().join('/')
}

/* ---------------- Barres horizontales (magnitude par identité) ---------------- */
export function HBarChart({ items, color = SERIES.recru }: {
  items: { label: string; value: number }[]
  color?: string
}) {
  if (items.length === 0) return <Empty />
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const pct = Math.max((it.value / max) * 100, 1.5)
        return (
          <div key={it.label} className="flex items-center gap-3 group">
            <div className="w-40 shrink-0 text-sm truncate text-right" style={{ color: 'var(--text-muted)' }} title={it.label}>{it.label}</div>
            <div className="flex-1 h-6 rounded-md relative" style={{ background: 'var(--app-bg)' }}>
              <div className="h-full rounded-md transition-all group-hover:brightness-110" style={{ width: `${pct}%`, background: color }} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold" style={{ color: 'var(--text)' }}>{formatFCFA(it.value)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- Répartition (part de chaque type) ---------------- */
export function ShareBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return <Empty />
  return (
    <div className="space-y-3">
      <div className="flex w-full h-8 rounded-lg overflow-hidden" style={{ background: 'var(--app-bg)' }}>
        {segments.filter((s) => s.value > 0).map((s, i) => (
          <div key={s.label} title={`${s.label} : ${formatFCFA(s.value)}`}
            className="h-full flex items-center justify-center transition-all hover:brightness-110"
            style={{ width: `${(s.value / total) * 100}%`, background: s.color, borderLeft: i > 0 ? '2px solid var(--surface)' : undefined }}>
            {s.value / total > 0.09 && <span className="text-[11px] font-bold text-white">{Math.round((s.value / total) * 100)}%</span>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
            <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>{formatFCFA(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Courbe temporelle (2 séries, avec survol) ---------------- */
export function TimeAreaChart({ data }: { data: { date: string; recru: number; reabo: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  if (data.length === 0) return <Empty />

  const W = 900, H = 260, PAD = { t: 16, r: 16, b: 28, l: 56 }
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b
  const maxY = Math.max(...data.map((d) => Math.max(d.recru, d.reabo)), 1)
  const x = (i: number) => PAD.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const y = (v: number) => PAD.t + ih - (v / maxY) * ih

  const line = (key: 'recru' | 'reabo') => data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)},${y(d[key])}`).join(' ')
  const area = (key: 'recru' | 'reabo') => `${line(key)} L ${x(data.length - 1)},${y(0)} L ${x(0)},${y(0)} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => maxY * f)

  // Étiquettes d'axe : toutes si peu de points (mois), sinon début / milieu / fin (jours).
  const labelIdx = data.length <= 12
    ? data.map((_, i) => i)
    : [0, Math.floor(data.length / 2), data.length - 1].filter((v, i, a) => a.indexOf(v) === i)

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PAD.l) / iw) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-5 mb-2">
        <Legend color={SERIES.recru} label="Recrutement" />
        <Legend color={SERIES.reabo} label="Réabonnement" />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD.l - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--text-muted)">{compact(t)}</text>
          </g>
        ))}
        <path d={area('reabo')} fill={SERIES.reabo} opacity="0.10" />
        <path d={area('recru')} fill={SERIES.recru} opacity="0.12" />
        <path d={line('reabo')} fill="none" stroke={SERIES.reabo} strokeWidth="2" strokeLinejoin="round" />
        <path d={line('recru')} fill="none" stroke={SERIES.recru} strokeWidth="2" strokeLinejoin="round" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].recru)} r="4" fill={SERIES.recru} stroke="var(--surface)" strokeWidth="2" />
            <circle cx={x(hover)} cy={y(data[hover].reabo)} r="4" fill={SERIES.reabo} stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
        {/* labels x (début / milieu / fin) */}
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{axisLabel(data[i].date)}</text>
        ))}
      </svg>
      {hover !== null && (
        <div className="absolute top-0 pointer-events-none rounded-lg border shadow-lg px-3 py-2 text-xs"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', left: `${(x(hover) / W) * 100}%`, transform: 'translateX(-50%)' }}>
          <div className="font-bold mb-1" style={{ color: 'var(--text)' }}>{fullLabel(data[hover].date)}</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: SERIES.recru }} /><span style={{ color: 'var(--text-muted)' }}>Recrut.</span><span className="font-mono font-bold" style={{ color: 'var(--text)' }}>{formatFCFA(data[hover].recru)}</span></div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: SERIES.reabo }} /><span style={{ color: 'var(--text-muted)' }}>Réabo.</span><span className="font-mono font-bold" style={{ color: 'var(--text)' }}>{formatFCFA(data[hover].reabo)}</span></div>
        </div>
      )}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return <div className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded-sm" style={{ background: color }} /><span style={{ color: 'var(--text-muted)' }}>{label}</span></div>
}
function Empty() {
  return <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Aucune donnée sur cette période</div>
}
