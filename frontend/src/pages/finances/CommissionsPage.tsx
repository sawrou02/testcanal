import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { formatFCFA, cn } from '../../lib/utils'
import { getCommissions, type CommissionsResult, type CommissionLigne } from '../../lib/api'

function Card({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div
      id={id}
      className={cn('bg-white rounded-xl border border-app-border p-5 shadow-sm', className)}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}

const currentMonth = () => new Date().toISOString().slice(0, 7)

export default function CommissionsPage() {
  const toast = useToast()
  const [periode, setPeriode] = useState(currentMonth())
  const [data, setData] = useState<CommissionsResult | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (p: string) => {
    setLoading(true)
    try {
      const res = await getCommissions(p)
      setData(res)
    } catch {
      toast.error('Erreur lors du chargement des commissions')
      setData(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void fetchData(periode)
  }, [periode, fetchData])

  type Row = CommissionLigne & Record<string, unknown>

  const money = (v: unknown) => formatFCFA(Number(v) || 0)
  const num = (v: unknown) => (Number(v) || 0).toLocaleString('fr-FR')

  const columns = [
    {
      key: 'pdv',
      label: 'Partenaire',
      render: (_v: unknown, row: Row) => row.pdv?.raisonSociale ?? '-',
    },
    { key: 'nbRecru', label: 'Nb recrut.', align: 'right' as const, render: num },
    { key: 'caRecru', label: 'CA recrut.', align: 'right' as const, render: money },
    { key: 'nbReabo', label: 'Nb réabo', align: 'right' as const, render: num },
    { key: 'comRecrutement', label: 'Com. recrut.', align: 'right' as const, render: money },
    { key: 'comFormule', label: 'Com. formule', align: 'right' as const, render: money },
    { key: 'comReabo', label: 'Com. réabo', align: 'right' as const, render: money },
    { key: 'primeMigration', label: 'Prime migration', align: 'right' as const, render: money },
    {
      key: 'comNette',
      label: 'Com. nette',
      align: 'right' as const,
      render: (_v: unknown, row: Row) => (
        <span className="font-bold text-primary-dark">{formatFCFA(row.comNette)}</span>
      ),
    },
  ]

  const lignes = data?.lignes ?? []
  const moneyKeys: (keyof CommissionLigne)[] = [
    'caRecru',
    'comRecrutement',
    'comFormule',
    'comReabo',
    'primeMigration',
    'comNette',
  ]
  const countKeys: (keyof CommissionLigne)[] = ['nbRecru', 'nbReabo']

  const totalsRow = lignes.length
    ? ({
        pdv: { code: '', raisonSociale: 'TOTAL' },
        ...countKeys.reduce(
          (acc, k) => {
            acc[k] = lignes.reduce((s, l) => s + (Number(l[k]) || 0), 0)
            return acc
          },
          {} as Record<string, number>,
        ),
        ...moneyKeys.reduce(
          (acc, k) => {
            acc[k] = lignes.reduce((s, l) => s + (Number(l[k]) || 0), 0)
            return acc
          },
          {} as Record<string, number>,
        ),
      } as unknown as Partial<Row>)
    : undefined

  const params = data?.params
  const paramsNote = params
    ? `Bonus matériel ${formatFCFA(params.bonusMateriel)} · Formule ${Math.round(
        params.tauxFormule * 100,
      )}% · Réabo ${Math.round(params.tauxReabo * 100)}% · Prime migration ${formatFCFA(
        params.primeMigration,
      )} · Déduction non-qualifié ${formatFCFA(params.deductionParNonQualifie)}`
    : ''

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-app-text" style={{ color: 'var(--text)' }}>
            Commissions
          </h2>
          <p className="text-sm text-app-muted mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Calcul des commissions des partenaires par période
          </p>
        </div>
        <div className="flex items-end gap-3 no-print">
          <div>
            <label className="text-sm font-medium text-app-text block mb-1.5">Période</label>
            <input
              type="month"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button variant="secondary" onClick={() => window.print()}>
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading || !data ? (
          <SkeletonCardGrid count={4} />
        ) : (
          <>
            <KpiCard
              label="Com. brute"
              value={formatFCFA(data.totaux.comBrute)}
              delta={0}
              deltaLabel="période"
              color="blue"
              icon="card"
            />
            <KpiCard
              label="Déductions"
              value={formatFCFA(data.totaux.deductions)}
              delta={0}
              deltaLabel="période"
              color="red"
              icon="card"
            />
            <KpiCard
              label="Com. nette"
              value={formatFCFA(data.totaux.comNette)}
              delta={0}
              deltaLabel="à payer"
              color="green"
              icon="card"
            />
            <KpiCard
              label="Partenaires"
              value={data.totaux.partenaires.toLocaleString('fr-FR')}
              delta={0}
              deltaLabel="concernés"
              color="gold"
              icon="users"
            />
          </>
        )}
      </div>

      <Card id="commissions-print">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-base font-bold text-app-text" style={{ color: 'var(--text)' }}>
            Détail des commissions {data ? `— ${data.periode}` : ''}
          </h3>
        </div>
        {paramsNote && (
          <p className="text-xs text-app-muted mb-3" style={{ color: 'var(--text-muted)' }}>
            {paramsNote}
          </p>
        )}
        <div className="min-h-[420px]">
          <DataTable
            columns={columns}
            rows={lignes as Row[]}
            loading={loading}
            emptyMessage="Aucune commission pour cette période"
            totalsRow={totalsRow}
          />
        </div>
      </Card>
    </div>
  )
}
