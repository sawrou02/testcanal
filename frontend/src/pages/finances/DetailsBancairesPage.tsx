import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { listOperationsBancaires } from '../../lib/api'
import type { OperationBancaire } from '../../lib/api'
import { formatFCFA, formatDate, cn } from '../../lib/utils'

type Row = OperationBancaire & Record<string, unknown>

function typeBadge(type: OperationBancaire['type']) {
  return type === 'VERSEMENT' ? (
    <Badge variant="info">Versement</Badge>
  ) : (
    <Badge variant="neutral">Retrait</Badge>
  )
}

function statutBadge(statut: OperationBancaire['statut']) {
  if (statut === 'VALIDE') return <Badge variant="success">Validé</Badge>
  if (statut === 'ENATTENTE') return <Badge variant="warning">En attente</Badge>
  return <Badge variant="danger">Rejeté</Badge>
}

export default function DetailsBancairesPage() {
  const toast = useToast()
  const [rows, setRows] = useState<OperationBancaire[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listOperationsBancaires()
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Erreur lors du chargement')
          setRows([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { totalVersements, totalRetraits, soldeNet, totalMontant } = useMemo(() => {
    let totalVersements = 0
    let totalRetraits = 0
    for (const r of rows) {
      if (r.type === 'VERSEMENT') totalVersements += r.montant
      else totalRetraits += r.montant
    }
    return {
      totalVersements,
      totalRetraits,
      soldeNet: totalVersements - totalRetraits,
      totalMontant: totalVersements + totalRetraits,
    }
  }, [rows])

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (_v: unknown, row: Row) => formatDate(row.date),
    },
    {
      key: 'type',
      label: 'Type',
      render: (_v: unknown, row: Row) => typeBadge(row.type),
    },
    {
      key: 'sens',
      label: 'Sens',
      render: (_v: unknown, row: Row) => (
        <span
          className={cn(
            'font-semibold',
            row.sens === 'CREDIT' ? 'text-primary' : 'text-danger',
          )}
        >
          {row.sens === 'CREDIT' ? 'Crédit' : 'Débit'}
        </span>
      ),
    },
    {
      key: 'pdv',
      label: 'PDV',
      render: (_v: unknown, row: Row) => row.pdv?.raisonSociale ?? '-',
    },
    { key: 'banqueNom', label: 'Banque' },
    {
      key: 'montant',
      label: 'Montant',
      align: 'right' as const,
      render: (_v: unknown, row: Row) => formatFCFA(row.montant),
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (_v: unknown, row: Row) => statutBadge(row.statut),
    },
  ]

  const totalsRow: Partial<Row> = {
    date: 'Total' as unknown as Row['date'],
    montant: totalMontant,
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-app-text" style={{ color: 'var(--text)' }}>
          Détails bancaires
        </h2>
        <p className="text-sm text-app-muted mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Toutes les opérations bancaires (versements et retraits)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <SkeletonCardGrid count={3} />
        ) : (
          <>
            <KpiCard
              label="Total versements"
              value={formatFCFA(totalVersements)}
              delta={0}
              deltaLabel="crédits"
              color="green"
              icon="trend"
            />
            <KpiCard
              label="Total retraits"
              value={formatFCFA(totalRetraits)}
              delta={0}
              deltaLabel="débits"
              color="red"
              icon="trend"
            />
            <KpiCard
              label="Solde net"
              value={formatFCFA(soldeNet)}
              delta={0}
              deltaLabel="versements − retraits"
              color="blue"
              icon="⚖️"
            />
          </>
        )}
      </div>

      <div
        className="bg-white rounded-xl border border-app-border p-5 shadow-sm"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-base font-bold text-app-text mb-4" style={{ color: 'var(--text)' }}>
          Opérations bancaires
        </h3>
        <div className="min-h-[420px]">
          <DataTable
            columns={columns}
            rows={rows as Row[]}
            loading={loading}
            emptyMessage="Aucune opération"
            totalsRow={rows.length > 0 ? totalsRow : undefined}
          />
        </div>
      </div>
    </div>
  )
}
