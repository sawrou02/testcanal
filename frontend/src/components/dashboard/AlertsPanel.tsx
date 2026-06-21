import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import {
  versementStats,
  serviceAbonnementStats,
  listImmobilises,
  rapportStats,
} from '../../lib/api'

interface Alert {
  id: string
  type: 'urgent' | 'warn' | 'ok'
  message: string
  action: string | null
  lien?: string
}

const typeConfig = {
  urgent: { dot: 'bg-danger', label: 'text-danger' },
  warn: { dot: 'bg-gold', label: 'text-gold-dark' },
  ok: { dot: 'bg-primary', label: 'text-primary' },
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next: Alert[] = []
      try {
        const v = await versementStats()
        if (v.enAttenteCount > 0)
          next.push({ id: 'vers', type: 'urgent', message: `${v.enAttenteCount} versement(s) en attente de validation`, action: 'Voir', lien: '/app/versement-banque' })
      } catch { /* ignore */ }
      try {
        const s = await serviceAbonnementStats()
        if (s.echus > 0)
          next.push({ id: 'echus', type: 'warn', message: `${s.echus} abonné(s) échu(s) à relancer`, action: 'Voir', lien: '/app/liste-echus' })
      } catch { /* ignore */ }
      try {
        const im = await listImmobilises()
        if (im.length > 0)
          next.push({ id: 'immob', type: 'urgent', message: `${im.length} décodeur(s) immobilisé(s) depuis plus de 3 mois`, action: 'Voir', lien: '/app/decodeurs-immobilises' })
      } catch { /* ignore */ }
      try {
        const r = await rapportStats()
        if (r.ecarts > 0)
          next.push({ id: 'ecarts', type: 'warn', message: `${r.ecarts} rapport(s) avec écarts à rapprocher`, action: 'Matcher', lien: '/app/matching' })
      } catch { /* ignore */ }
      if (!cancelled) { setAlerts(next); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const urgentes = alerts.filter((a) => a.type === 'urgent').length

  return (
    <div
      className="bg-white rounded-xl border border-app-border shadow-sm overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="px-5 py-4 border-b border-app-border" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-app-text" style={{ color: 'var(--text)' }}>
            Alertes &amp; Actions
          </h3>
          {urgentes > 0 && (
            <span className="text-xs font-semibold bg-danger text-white px-2 py-0.5 rounded-full">
              {urgentes} urgentes
            </span>
          )}
        </div>
      </div>
      <div className="divide-y divide-app-border min-h-[8rem]" style={{ borderColor: 'var(--border)' }}>
        {loading ? (
          <div className="px-5 py-8 text-sm text-app-muted" style={{ color: 'var(--text-muted)' }}>Chargement…</div>
        ) : alerts.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-app-muted" style={{ color: 'var(--text-muted)' }}>
            Aucune alerte — tout est à jour ✓
          </div>
        ) : (
          alerts.map((alert) => {
            const config = typeConfig[alert.type]
            return (
              <div key={alert.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <span className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5', config.dot)} />
                <p className="flex-1 text-sm text-app-text leading-snug" style={{ color: 'var(--text)' }}>
                  {alert.message}
                </p>
                {alert.action && (
                  <a href={alert.lien} className="shrink-0 text-xs font-semibold text-primary hover:text-primary-dark underline">
                    {alert.action}
                  </a>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
