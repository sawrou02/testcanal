import { Badge } from '../../components/ui/Badge'
import { cn } from '../../lib/utils'
import type { DecodeurStatut } from '../../lib/api'

export const LOGISTIQUE_MUTATION_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'LOGISTICIEN',
]

export type Row = Record<string, unknown>

export const asRows = <T,>(data: T[]): Row[] => data as unknown as Row[]

export function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('bg-white rounded-xl border border-app-border p-5 shadow-sm', className)}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-xl font-black text-app-text" style={{ color: 'var(--text)' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-app-muted mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

const STATUT_CONFIG: Record<
  DecodeurStatut,
  { variant: 'success' | 'danger' | 'info' | 'gold'; label: string }
> = {
  EN_STOCK_ENTREPOT: { variant: 'info', label: 'En stock entrepôt' },
  EN_STOCK_PDV: { variant: 'gold', label: 'En stock PDV' },
  VENDU: { variant: 'success', label: 'Vendu' },
  IMMOBILISE: { variant: 'danger', label: 'Immobilisé' },
  DEFECTUEUX: { variant: 'danger', label: 'Défectueux' },
}

/**
 * Decodeur statut Badge. EN_STOCK_PDV uses a gold style which the base Badge
 * does not expose, so we apply the gold classes directly via className.
 */
export function statutBadge(statut: DecodeurStatut) {
  const cfg = STATUT_CONFIG[statut]
  if (!cfg) return <Badge variant="neutral">{String(statut)}</Badge>
  if (cfg.variant === 'gold') {
    return (
      <Badge variant="warning" className="bg-yellow-50 text-yellow-800">
        {cfg.label}
      </Badge>
    )
  }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

export function typeBadge(type: string) {
  return <Badge variant="neutral">{type}</Badge>
}
