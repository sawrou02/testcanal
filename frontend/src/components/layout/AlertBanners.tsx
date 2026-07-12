import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { t } from '../../lib/locale'
import { versementStats, listImmobilises } from '../../lib/api'

interface AlertBanner {
  id: string
  type: 'warn' | 'danger' | 'info'
  message: string
}

const typeConfig = {
  warn: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  danger: 'bg-red-50 border-red-200 text-red-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
}

export function AlertBanners() {
  const [alerts, setAlerts] = useState<AlertBanner[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next: AlertBanner[] = []
      try {
        const v = await versementStats()
        if (v.enAttenteCount > 0) {
          next.push({
            id: 'versements',
            type: 'warn',
            message: `${v.enAttenteCount} ${t('versement(s) en attente de validation')}`,
          })
        }
      } catch {
        /* ignore */
      }
      try {
        const immob = await listImmobilises()
        if (immob.length > 0) {
          next.push({
            id: 'immobilises',
            type: 'warn',
            message: `${immob.length} ${t('décodeur(s) immobilisé(s) depuis plus de 3 mois')}`,
          })
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setAlerts(next)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const visible = alerts.filter((a) => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-1 px-4 pt-2">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm',
            typeConfig[alert.type],
          )}
        >
          <span className="shrink-0">{alert.type === 'warn' ? '⚠' : alert.type === 'danger' ? '✕' : 'ℹ'}</span>
          <span className="flex-1">{alert.message}</span>
          <button
            onClick={() => setDismissed((s) => new Set([...s, alert.id]))}
            className="shrink-0 opacity-60 hover:opacity-100 font-bold"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
