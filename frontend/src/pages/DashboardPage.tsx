import { KpiCard } from '../components/dashboard/KpiCard'
import { ActivityChart } from '../components/dashboard/ActivityChart'
import { SectorTable } from '../components/dashboard/SectorTable'
import { AlertsPanel } from '../components/dashboard/AlertsPanel'
import { formatFCFA } from '../lib/utils'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-black text-app-text" style={{ color: 'var(--text)' }}>
          Tableau de bord
        </h1>
        <p className="text-sm text-app-muted mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Juin 2026 — Vue d'ensemble de la distribution
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Encaissé du mois"
          value={formatFCFA(128600000)}
          delta={9}
          deltaLabel="% vs M-1"
          color="green"
          icon="💰"
        />
        <KpiCard
          label="Recrutements"
          value="1 842"
          delta={12}
          deltaLabel="% vs M-1"
          color="blue"
          icon="👤"
        />
        <KpiCard
          label="Réabonnements"
          value="5 528"
          delta={6}
          deltaLabel="% vs M-1"
          color="gold"
          icon="🔄"
        />
        <KpiCard
          label="Stock décodeurs"
          value="3 240"
          delta={-48}
          deltaLabel="ce mois"
          color="red"
          icon="📡"
        />
      </div>

      {/* Activity Chart */}
      <ActivityChart />

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectorTable />
        </div>
        <div>
          <AlertsPanel />
        </div>
      </div>
    </div>
  )
}
