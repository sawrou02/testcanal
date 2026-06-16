import { formatFCFA } from '../../lib/utils'

const SECTORS = [
  { nom: 'Dakar Centre', nb_pdv: 215, nb_abonnes: 8420, ca_mois: 28600000, progression: 87 },
  { nom: 'Dakar Banlieue', nb_pdv: 312, nb_abonnes: 12850, ca_mois: 38200000, progression: 94 },
  { nom: 'Thiès', nb_pdv: 180, nb_abonnes: 6340, ca_mois: 18900000, progression: 72 },
  { nom: 'Petite Côte', nb_pdv: 145, nb_abonnes: 5120, ca_mois: 14800000, progression: 65 },
  { nom: 'Nord', nb_pdv: 210, nb_abonnes: 7200, ca_mois: 19500000, progression: 78 },
  { nom: 'Sud-Casamance', nb_pdv: 186, nb_abonnes: 4950, ca_mois: 12600000, progression: 58 },
]

export function SectorTable() {
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
          Juin 2026 — objectifs mensuels
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border" style={{ borderColor: 'var(--border)' }}>
              <th className="text-left px-5 py-3 font-semibold text-app-muted uppercase text-xs tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Secteur
              </th>
              <th className="text-right px-4 py-3 font-semibold text-app-muted uppercase text-xs tracking-wider" style={{ color: 'var(--text-muted)' }}>
                PDV
              </th>
              <th className="text-right px-4 py-3 font-semibold text-app-muted uppercase text-xs tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Abonnés
              </th>
              <th className="text-right px-4 py-3 font-semibold text-app-muted uppercase text-xs tracking-wider" style={{ color: 'var(--text-muted)' }}>
                CA Mois
              </th>
              <th className="px-4 py-3 font-semibold text-app-muted uppercase text-xs tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Objectif
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border" style={{ borderColor: 'var(--border)' }}>
            {SECTORS.map((sector) => (
              <tr key={sector.nom} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-app-text" style={{ color: 'var(--text)' }}>
                  {sector.nom}
                </td>
                <td className="px-4 py-3 text-right text-app-muted font-mono" style={{ color: 'var(--text-muted)' }}>
                  {sector.nb_pdv}
                </td>
                <td className="px-4 py-3 text-right text-app-muted font-mono" style={{ color: 'var(--text-muted)' }}>
                  {sector.nb_abonnes.toLocaleString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-app-text text-xs" style={{ color: 'var(--text)', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {formatFCFA(sector.ca_mois)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${sector.progression}%`,
                          background: sector.progression >= 90 ? '#0E8A4F' : sector.progression >= 70 ? '#E2A000' : '#D23A2C',
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-app-muted w-8 text-right" style={{ color: 'var(--text-muted)' }}>
                      {sector.progression}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
