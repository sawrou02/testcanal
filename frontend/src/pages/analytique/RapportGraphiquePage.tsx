import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { rapportGraphique, type RapportGraphiqueData } from '../../lib/api'
import { formatFCFA } from '../../lib/utils'
import { HBarChart, ShareBar, TimeAreaChart, SERIES } from '../../components/charts/RevenueCharts'
import { Card, PageHeader, PeriodeSelector, currentMonth } from './shared'

/** Petite tuile de statistique (sans variation, style bordereau). */
function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div
      className="rounded-xl border p-4 relative overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-black leading-tight" style={{ color: 'var(--text)', fontFamily: 'IBM Plex Mono, monospace' }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {children}
    </Card>
  )
}

const monthLabel = (p: string) => {
  if (!/^\d{4}-\d{2}$/.test(p)) return p
  const [y, m] = p.split('-')
  const names = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  return `${names[Number(m) - 1]} ${y}`
}

export default function RapportGraphiquePage() {
  const toast = useToast()
  const [periode, setPeriode] = useState(currentMonth())
  const [data, setData] = useState<RapportGraphiqueData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (p: string) => {
    setLoading(true)
    try {
      setData(await rapportGraphique(p))
    } catch {
      toast.error('Erreur lors du chargement du rapport')
      setData(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void fetchData(periode)
  }, [periode, fetchData])

  const t = data?.totaux
  const panierMoyen = t && t.nbOps > 0 ? t.caTotal / t.nbOps : 0

  const shareSegments = t
    ? [
        { label: 'Recrutement', value: t.caRecru, color: SERIES.recru },
        { label: 'Réabonnement', value: t.caReabo, color: SERIES.reabo },
        { label: 'Migration', value: t.caMigration, color: SERIES.migration },
        { label: 'Autres', value: t.caImpaye, color: SERIES.autre },
      ]
    : []

  return (
    <div className="space-y-4" id="rapport-print">
      <PageHeader
        title="Rapport graphique"
        subtitle="Chiffre d'affaires : recrutement, réabonnement et répartition"
      >
        <PeriodeSelector periode={periode} onChange={setPeriode} />
        <Button variant="secondary" onClick={() => window.print()}>
          Imprimer / PDF
        </Button>
      </PageHeader>

      {/* Bandeau titre pour l'impression */}
      <div className="hidden print:block">
        <p className="text-lg font-black" style={{ color: 'var(--text)' }}>
          Bordereau d'activité — {monthLabel(periode)}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading || !t ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 h-[92px] animate-pulse" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
          ))
        ) : (
          <>
            <Stat label="CA total" value={formatFCFA(t.caTotal)} sub={`${t.nbOps.toLocaleString('fr-FR')} opérations`} accent={SERIES.recru} />
            <Stat label="Recrutement" value={formatFCFA(t.caRecru)} sub={`${t.nbRecru.toLocaleString('fr-FR')} nouveaux abonnés`} accent={SERIES.recru} />
            <Stat label="Réabonnement" value={formatFCFA(t.caReabo)} sub={`${t.nbReabo.toLocaleString('fr-FR')} réabonnements`} accent={SERIES.reabo} />
            <Stat label="Panier moyen" value={formatFCFA(panierMoyen)} sub="par opération" accent={SERIES.migration} />
          </>
        )}
      </div>

      {/* Évolution temporelle */}
      <ChartCard title="Évolution du chiffre d'affaires" subtitle={`Jour par jour — ${monthLabel(periode)}`}>
        {loading ? (
          <div className="h-64 animate-pulse rounded-lg" style={{ background: 'var(--app-bg)' }} />
        ) : (
          <TimeAreaChart data={data?.byDay ?? []} />
        )}
      </ChartCard>

      {/* Répartition + Formules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Répartition par type" subtitle="Part de chaque nature d'opération">
          {loading ? (
            <div className="h-24 animate-pulse rounded-lg" style={{ background: 'var(--app-bg)' }} />
          ) : (
            <ShareBar segments={shareSegments} />
          )}
        </ChartCard>

        <ChartCard title="Top formules" subtitle="Chiffre d'affaires par formule">
          {loading ? (
            <div className="h-64 animate-pulse rounded-lg" style={{ background: 'var(--app-bg)' }} />
          ) : (
            <HBarChart items={(data?.byFormule ?? []).map((f) => ({ label: f.formule, value: f.montant }))} color={SERIES.reabo} />
          )}
        </ChartCard>
      </div>

      {/* Top PDV */}
      <ChartCard title="Top points de vente" subtitle="Chiffre d'affaires par PDV (10 premiers)">
        {loading ? (
          <div className="h-64 animate-pulse rounded-lg" style={{ background: 'var(--app-bg)' }} />
        ) : (
          <HBarChart items={(data?.byPdv ?? []).map((p) => ({ label: p.pdv, value: p.montant }))} color={SERIES.recru} />
        )}
      </ChartCard>
    </div>
  )
}
