import { useCallback, useEffect, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { DataTable } from '../../components/ui/DataTable'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { securityEvents, securityStats, type SecurityEventRow, type SecurityStats } from '../../lib/api'
import { Card, PageHeader, type Row } from '../../components/ui/Section'

const TYPE_LABEL: Record<string, { label: string; variant: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  LOGIN_OK: { label: 'Connexion réussie', variant: 'success' },
  LOGIN_FAILED: { label: 'Échec connexion', variant: 'warning' },
  LOGIN_LOCKED: { label: 'Compte bloqué', variant: 'danger' },
  ACCESS_DENIED: { label: 'Accès refusé', variant: 'danger' },
}

export default function SecurityPage() {
  const toast = useToast()
  const [rows, setRows] = useState<SecurityEventRow[]>([])
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const [ev, st] = await Promise.all([securityEvents(), securityStats()])
      setRows(ev)
      setStats(st)
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { void refetch() }, [refetch])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Sécurité" subtitle="Surveillance des connexions, blocages et accès refusés" />
        <Button variant="secondary" onClick={() => void refetch()}>Rafraîchir</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Échecs de connexion (jour)" value={String(stats?.failedToday ?? 0)} delta={0} deltaLabel="aujourd’hui" color="gold" />
        <KpiCard label="Comptes bloqués" value={String(stats?.lockedAccounts ?? 0)} delta={0} deltaLabel="en ce moment (15 min)" color="red" />
        <KpiCard label="Accès refusés (jour)" value={String(stats?.accessDeniedToday ?? 0)} delta={0} deltaLabel="tentatives interdites" color="blue" />
      </div>

      <Card>
        <div className="min-h-[360px]">
          <DataTable<Row>
            loading={loading}
            rows={rows as unknown as Row[]}
            searchable
            exportTitle="Journal de sécurité"
            emptyMessage="Aucun événement de sécurité"
            columns={[
              { key: 'createdAt', label: 'Date/heure', render: (v) => (v ? new Date(String(v)).toLocaleString('fr-FR') : '—') },
              { key: 'type', label: 'Type', render: (v) => {
                const t = TYPE_LABEL[String(v)] ?? { label: String(v), variant: 'neutral' as const }
                return <Badge variant={t.variant}>{t.label}</Badge>
              } },
              { key: 'identifier', label: 'Identifiant', render: (v) => (v ? String(v) : '—') },
              { key: 'ip', label: 'Machine (IP)', render: (v) => (v ? String(v) : '—') },
              { key: 'message', label: 'Détail', render: (v) => (v ? String(v) : '—') },
            ]}
          />
        </div>
      </Card>

      <p className="text-xs text-app-muted">
        🔒 Protection active : blocage du compte après 5 échecs (15 min), vérification anti-robot dès 3 échecs,
        limite de débit, et journal de toutes les tentatives. Une alerte apparaît dans la cloche en cas de blocage.
      </p>
    </div>
  )
}
