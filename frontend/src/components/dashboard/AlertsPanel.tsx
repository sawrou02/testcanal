import { cn } from '../../lib/utils'

const ALERTS = [
  { id: '1', type: 'urgent' as const, message: '3 versements en attente — valider avant le 20/06', action: 'Voir', lien: '/app/versement-banque' },
  { id: '2', type: 'warn' as const, message: '12 abonnés échus non traités ce mois', action: 'Voir', lien: '/app/liste-echus' },
  { id: '3', type: 'warn' as const, message: 'Rapport du 15/06 en attente de matching', action: 'Matcher', lien: '/app/matching' },
  { id: '4', type: 'ok' as const, message: 'Versement BOR-2026-005 validé avec succès', action: null },
  { id: '5', type: 'urgent' as const, message: '5 décodeurs immobilisés à l\'entrepôt — traitement requis', action: 'Voir', lien: '/app/decodeurs-immobilises' },
]

const typeConfig = {
  urgent: { dot: 'bg-danger', label: 'text-danger' },
  warn: { dot: 'bg-gold', label: 'text-gold-dark' },
  ok: { dot: 'bg-primary', label: 'text-primary' },
}

export function AlertsPanel() {
  return (
    <div
      className="bg-white rounded-xl border border-app-border shadow-sm overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="px-5 py-4 border-b border-app-border" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-app-text" style={{ color: 'var(--text)' }}>
            Alertes & Actions
          </h3>
          <span className="text-xs font-semibold bg-danger text-white px-2 py-0.5 rounded-full">
            {ALERTS.filter((a) => a.type === 'urgent').length} urgentes
          </span>
        </div>
      </div>
      <div className="divide-y divide-app-border" style={{ borderColor: 'var(--border)' }}>
        {ALERTS.map((alert) => {
          const config = typeConfig[alert.type]
          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <span className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5', config.dot)} />
              <p className="flex-1 text-sm text-app-text leading-snug" style={{ color: 'var(--text)' }}>
                {alert.message}
              </p>
              {alert.action && (
                <a
                  href={alert.lien}
                  className="shrink-0 text-xs font-semibold text-primary hover:text-primary-dark underline"
                >
                  {alert.action}
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
