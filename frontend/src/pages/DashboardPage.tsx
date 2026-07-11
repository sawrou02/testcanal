import { KpiCard } from '../components/dashboard/KpiCard'
import { ActivityChart } from '../components/dashboard/ActivityChart'
import { SectorTable } from '../components/dashboard/SectorTable'
import { AlertsPanel } from '../components/dashboard/AlertsPanel'
import { SyntheseCards } from '../components/dashboard/SyntheseCards'
import { DashboardObjectifs } from '../components/dashboard/DashboardObjectifs'
import { SkeletonCardGrid } from '../components/ui/Skeleton'
import { useResourceItem } from '../hooks/useResource'
import type { DashboardStats } from '../lib/api'
import { formatFCFA } from '../lib/utils'

export default function DashboardPage() {
  const { data: stats, loading } = useResourceItem<DashboardStats>('/dashboard/stats')

  const num = (n: number | undefined) => (n ?? 0).toLocaleString('fr-FR')

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-black text-app-text" style={{ color: 'var(--text)' }}>
          Tableau de bord
        </h1>
        <p className="text-sm text-app-muted mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Vue d'ensemble de la distribution
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading || !stats ? (
          <SkeletonCardGrid count={4} />
        ) : (
          <>
            <KpiCard
              label="Encaissé du mois"
              value={formatFCFA(stats.encaisseDuMois)}
              delta={0}
              trend={stats.deltas?.encaisse ?? null}
              deltaLabel="vs mois dernier"
              color="green"
              icon="card"
            />
            <KpiCard
              label="Recrutements"
              value={num(stats.recrutementsCount)}
              delta={0}
              trend={stats.deltas?.recrutements ?? null}
              deltaLabel="vs mois dernier"
              color="blue"
              icon="users"
            />
            <KpiCard
              label="Réabonnements"
              value={num(stats.reaboCount)}
              delta={0}
              trend={stats.deltas?.reabo ?? null}
              deltaLabel="vs mois dernier"
              color="gold"
              icon="trend"
            />
            <KpiCard
              label="Stock décodeurs"
              value={num(stats.stockDecodeurs)}
              delta={0}
              deltaLabel="disponibles"
              color="red"
              icon="package"
            />
          </>
        )}
      </div>

      {/* Synthèse (Recouvrement / Vente / Réabonnement / Logistique) */}
      <SyntheseCards />

      {/* Suivi des objectifs par secteur / PDV */}
      <DashboardObjectifs />

      {/* Activity Chart */}
      <ActivityChart data={stats?.activite30j ?? []} loading={loading} />

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectorTable data={stats?.soldesParSecteur ?? []} loading={loading} />
        </div>
        <div>
          <AlertsPanel />
        </div>
      </div>
    </div>
  )
}
