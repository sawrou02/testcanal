import { cn } from '../../lib/utils'
import { Icon } from '../ui/Icon'

interface KpiCardProps {
  label: string
  value: string
  delta: number
  deltaLabel: string
  color?: 'green' | 'gold' | 'red' | 'blue'
  icon?: string
}

const colorMap = {
  green: { accent: 'border-t-primary', badge: 'bg-primary-light text-primary-dark' },
  gold: { accent: 'border-t-gold', badge: 'bg-yellow-50 text-yellow-800' },
  red: { accent: 'border-t-danger', badge: 'bg-red-50 text-danger-dark' },
  blue: { accent: 'border-t-blue-600', badge: 'bg-blue-50 text-blue-800' },
}

export function KpiCard({ label, value, delta, deltaLabel, color = 'green', icon }: KpiCardProps) {
  const colors = colorMap[color]
  const isPositive = delta >= 0
  const deltaColor = color === 'red' ? (isPositive ? 'text-danger' : 'text-primary') : (isPositive ? 'text-primary' : 'text-danger')

  return (
    <div
      className={cn(
        'bg-white rounded-xl p-5 shadow-sm border border-app-border border-t-4',
        colors.accent,
      )}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-app-muted mb-1" style={{ color: 'var(--text-muted)' }}>
            {label}
          </p>
          <p
            className="text-2xl font-bold font-mono tracking-tight text-app-text leading-tight"
            style={{ color: 'var(--text)', fontFamily: 'IBM Plex Mono, monospace' }}
          >
            {value}
          </p>
        </div>
        {icon && (
          <span className={cn('shrink-0 w-9 h-9 rounded-lg flex items-center justify-center', colors.badge)}>
            <Icon name={icon} size={18} />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className={cn('text-sm font-semibold', deltaColor)}>
          {isPositive ? '+' : ''}{delta}{typeof delta === 'number' && Math.abs(delta) < 1000 ? (deltaLabel.includes('%') ? '' : '') : ''}
        </span>
        <span className="text-xs text-app-subtle" style={{ color: 'var(--text-muted)' }}>
          {deltaLabel}
        </span>
      </div>
    </div>
  )
}
