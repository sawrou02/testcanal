import { useState } from 'react'
import { cn } from '../../lib/utils'

interface AlertBanner {
  id: string
  type: 'warn' | 'danger' | 'info'
  message: string
}

const defaultAlerts: AlertBanner[] = [
  { id: '1', type: 'warn', message: '3 versements en attente de validation depuis plus de 5 jours — action requise' },
  { id: '2', type: 'info', message: 'Rapport du 15/06 importé — matching en cours' },
]

const typeConfig = {
  warn: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  danger: 'bg-red-50 border-red-200 text-red-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
}

export function AlertBanners() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const visible = defaultAlerts.filter((a) => !dismissed.has(a.id))

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
          <span className="shrink-0">
            {alert.type === 'warn' ? '⚠' : alert.type === 'danger' ? '✕' : 'ℹ'}
          </span>
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
