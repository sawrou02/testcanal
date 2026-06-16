import { useMemo } from 'react'
import { formatDate } from '../../lib/utils'

export interface ActivitePoint {
  date: string
  recrut: number
  reabo: number
}

function smoothPath(points: [number, number][]) {
  if (points.length < 2) return ''
  let d = `M ${points[0][0]},${points[0][1]}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpX = (prev[0] + curr[0]) / 2
    d += ` C ${cpX},${prev[1]} ${cpX},${curr[1]} ${curr[0]},${curr[1]}`
  }
  return d
}

interface ActivityChartProps {
  data?: ActivitePoint[]
  loading?: boolean
}

export function ActivityChart({ data = [], loading = false }: ActivityChartProps) {
  const WIDTH = 800
  const HEIGHT = 220
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 }
  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom

  const { recrutPoints, reaboPoints, maxVal, minVal, xLabels, hasData } = useMemo(() => {
    if (data.length < 2) {
      return {
        recrutPoints: [] as [number, number][],
        reaboPoints: [] as [number, number][],
        maxVal: 0,
        minVal: 0,
        xLabels: [] as { x: number; label: string }[],
        hasData: false,
      }
    }
    const recruts = data.map((d) => d.recrut)
    const reabos = data.map((d) => d.reabo)
    const allVals = [...recruts, ...reabos]
    const rawMax = Math.max(...allVals)
    const rawMin = Math.min(...allVals)
    const maxVal = rawMax * 1.1 || 1
    const minVal = rawMin * 0.9
    const span = maxVal - minVal || 1

    const toX = (i: number) => PAD.left + (i / (data.length - 1)) * innerW
    const toY = (v: number) => PAD.top + (1 - (v - minVal) / span) * innerH

    const recrutPoints: [number, number][] = data.map((d, i) => [toX(i), toY(d.recrut)])
    const reaboPoints: [number, number][] = data.map((d, i) => [toX(i), toY(d.reabo)])

    const xLabels = data
      .map((d, i) => ({ d, i }))
      .filter(({ i }) => i % 5 === 0 || i === data.length - 1)
      .map(({ d, i }) => ({ x: toX(i), label: formatDate(d.date) }))

    return { recrutPoints, reaboPoints, maxVal, minVal, xLabels, hasData: true }
  }, [data, innerW, innerH, PAD.left, PAD.top])

  return (
    <div
      className="bg-white rounded-xl border border-app-border p-5 shadow-sm"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-app-text" style={{ color: 'var(--text)' }}>
            Activité commerciale — 30 jours
          </h3>
          <p className="text-sm text-app-muted" style={{ color: 'var(--text-muted)' }}>
            Recrutements et réabonnements
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-primary inline-block rounded" />
            <span className="text-app-muted" style={{ color: 'var(--text-muted)' }}>Recrutements</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-gold inline-block rounded" />
            <span className="text-app-muted" style={{ color: 'var(--text-muted)' }}>Réabonnements</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div
            className="w-full rounded-lg bg-gray-100 animate-pulse"
            style={{ height: 220 }}
          />
        ) : !hasData ? (
          <div
            className="w-full flex items-center justify-center text-sm text-app-muted"
            style={{ height: 220, color: 'var(--text-muted)' }}
          >
            Aucune donnée d'activité disponible
          </div>
        ) : (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          style={{ minWidth: 480, maxHeight: 240 }}
        >
          {/* Y axis gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = PAD.top + t * innerH
            const val = Math.round(maxVal - t * (maxVal - minVal))
            return (
              <g key={t}>
                <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#E6EAE3" strokeWidth="1" />
                <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#8A938B">{val}</text>
              </g>
            )
          })}

          {/* X axis labels */}
          {xLabels.map(({ x, label }) => (
            <text key={label} x={x} y={HEIGHT - 8} textAnchor="middle" fontSize="10" fill="#8A938B">
              {label.slice(0, 5)}
            </text>
          ))}

          {/* Réabo line (background) */}
          <path d={smoothPath(reaboPoints)} fill="none" stroke="#E2A000" strokeWidth="2" strokeLinecap="round" />
          {reaboPoints.filter((_, i) => i % 5 === 0).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="#E2A000" />
          ))}

          {/* Recrut line (foreground) */}
          <path d={smoothPath(recrutPoints)} fill="none" stroke="#0E8A4F" strokeWidth="2.5" strokeLinecap="round" />
          {recrutPoints.filter((_, i) => i % 5 === 0).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.5" fill="#0E8A4F" />
          ))}
        </svg>
        )}
      </div>
    </div>
  )
}
