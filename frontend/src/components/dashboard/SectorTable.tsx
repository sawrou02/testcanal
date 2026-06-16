import { formatFCFA } from '../../lib/utils'

export interface SecteurSolde {
  secteur: string
  ventes: number
}

interface SectorTableProps {
  data?: SecteurSolde[]
  loading?: boolean
}

export function SectorTable({ data = [], loading = false }: SectorTableProps) {
  const maxVentes = data.reduce((m, s) => Math.max(m, s.ventes), 0) || 1

  return (
    <div
      className="bg-white rounded-xl border border-app-border shadow-sm overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="px-5 py-4 border-b border-app-border" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-base font-bold text-app-text" style={{ color: 'var(--text)' }}>
          Performance par secteur
        </h3>
        <p className="text-sm text-app-muted" style={{ color: 'var(--text-muted)' }}>
          Ventes par secteur
        </p>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 rounded bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div
            className="py-12 text-center text-sm text-app-muted"
            style={{ color: 'var(--text-muted)' }}
          >
            Aucune donnée disponible
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app-border" style={{ borderColor: 'var(--border)' }}>
                <th className="text-left px-5 py-3 font-semibold text-app-muted uppercase text-xs tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Secteur
                </th>
                <th className="text-right px-4 py-3 font-semibold text-app-muted uppercase text-xs tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Ventes
                </th>
                <th className="px-4 py-3 font-semibold text-app-muted uppercase text-xs tracking-wider w-1/3" style={{ color: 'var(--text-muted)' }}>
                  Part
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border" style={{ borderColor: 'var(--border)' }}>
              {data.map((sector) => {
                const pct = Math.round((sector.ventes / maxVentes) * 100)
                return (
                  <tr key={sector.secteur} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-app-text" style={{ color: 'var(--text)' }}>
                      {sector.secteur}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-app-text text-xs" style={{ color: 'var(--text)', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatFCFA(sector.ventes)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 90 ? '#0E8A4F' : pct >= 70 ? '#E2A000' : '#D23A2C',
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-app-muted w-8 text-right" style={{ color: 'var(--text-muted)' }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
