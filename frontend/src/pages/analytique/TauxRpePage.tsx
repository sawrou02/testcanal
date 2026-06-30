import { useCallback, useEffect, useMemo, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { useToast } from '../../components/ui/Toast'
import { tauxRpe, type TauxRpeData, type TauxRpeRow } from '../../lib/api'
import { Card, PageHeader, type Row } from '../../components/ui/Section'

const tauxColor = (n: number) => (n >= 60 ? 'var(--primary)' : n >= 30 ? 'var(--gold-dark)' : 'var(--danger)')

export default function TauxRpePage() {
  const toast = useToast()
  const [data, setData] = useState<TauxRpeData | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try { setData(await tauxRpe()) } catch { toast.error('Erreur de chargement') } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { void refetch() }, [refetch])

  const rows = data?.rows ?? []
  const totalsRow = useMemo<Partial<Row>>(() => {
    if (!data) return {}
    return { pdv: { raisonSociale: 'TOTAL' }, nbEchus: data.totaux.nbEchus, nbReabo: data.totaux.nbReabo, taux: data.totaux.taux }
  }, [data])

  return (
    <div className="space-y-4">
      <PageHeader title="Taux RPE" subtitle="Retour à Plein Encaissement — part des abonnés qui se réabonnent, par PDV" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Réabonnés (mois)" value={String(data?.totaux.nbReabo ?? 0)} delta={0} deltaLabel="ce mois" color="green" />
        <KpiCard label="Échus" value={String(data?.totaux.nbEchus ?? 0)} delta={0} deltaLabel="à relancer" color="red" />
        <KpiCard label="Taux RPE global" value={`${data?.totaux.taux ?? 0} %`} delta={0} deltaLabel="réabo / (réabo + échus)" color="gold" />
      </div>

      <Card>
        <div className="min-h-[360px]">
          <DataTable<Row>
            loading={loading}
            rows={rows as unknown as Row[]}
            totalsRow={totalsRow}
            searchable
            exportTitle="Taux RPE par PDV"
            emptyMessage="Aucune donnée — il faut des abonnés échus ou réabonnés"
            columns={[
              { key: 'pdv', label: 'PDV', render: (_v, r) => (r as unknown as TauxRpeRow).pdv?.raisonSociale ?? '—' },
              { key: 'nbReabo', label: 'Réabonnés', align: 'right' },
              { key: 'nbEchus', label: 'Échus', align: 'right' },
              { key: 'taux', label: 'Taux RPE', align: 'right', render: (v) => {
                const n = Number(v ?? 0)
                return <span style={{ color: tauxColor(n), fontWeight: 700 }}>{n} %</span>
              } },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
