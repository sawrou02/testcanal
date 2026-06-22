import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { useToast } from '../../components/ui/Toast'
import { useResource } from '../../hooks/useResource'
import { formatDate } from '../../lib/utils'
import { suiviMpReport, type SuiviMpReport } from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls, type Row } from '../../components/ui/Section'

interface PdvLite { id: string; raisonSociale: string }
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const now = new Date()

export default function SuiviMpPage() {
  const toast = useToast()
  const { data: pdvs } = useResource<PdvLite>('/pdvs')

  const [mois, setMois] = useState(now.getMonth() + 1)
  const [annee, setAnnee] = useState(now.getFullYear())
  const [type, setType] = useState('M+1')
  const [pdvId, setPdvId] = useState('')

  const [report, setReport] = useState<SuiviMpReport | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      setReport(await suiviMpReport({ mois, annee, type, pdvId: pdvId || undefined }))
    } catch {
      toast.error('Erreur lors du chargement')
      setReport(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mois, annee, type, pdvId])

  useEffect(() => {
    void fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = report?.rows ?? []
  const totalsRow = useMemo<Partial<Row>>(() => {
    if (!report) return {}
    const t = report.totaux
    return { date: 'TOTAL', echeance: '', nbreRecrut: t.nbreRecrut, realise: t.realise, taux: t.taux, reseau: t.reseau, mobileMoney: t.mobileMoney, reste: t.reste }
  }, [report])

  const tauxCell = (v: unknown) => {
    const n = Number(v ?? 0)
    const color = n >= 75 ? 'var(--primary)' : n >= 40 ? 'var(--gold-dark)' : 'var(--danger)'
    return <span style={{ color, fontWeight: 700 }}>{n} %</span>
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Suivi Réabonnement M+" subtitle="Taux de réabonnement par cohorte de recrutement (M+1 / M+2 / M+3)" />

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[150px]">
            <FieldLabel>Mois de recrutement</FieldLabel>
            <select value={mois} onChange={(e) => setMois(Number(e.target.value))} className={inputCls}>
              {MOIS.map((label, i) => <option key={i} value={i + 1}>{label}</option>)}
            </select>
          </div>
          <div className="w-28">
            <FieldLabel>Année</FieldLabel>
            <input type="number" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className={inputCls} />
          </div>
          <div className="w-32">
            <FieldLabel>Type M+</FieldLabel>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              <option value="M+1">M+1</option>
              <option value="M+2">M+2</option>
              <option value="M+3">M+3</option>
            </select>
          </div>
          <div className="min-w-[180px] flex-1">
            <FieldLabel>Agence / PDV (optionnel)</FieldLabel>
            <select value={pdvId} onChange={(e) => setPdvId(e.target.value)} className={inputCls}>
              <option value="">Toutes les agences</option>
              {(pdvs ?? []).map((p) => <option key={p.id} value={p.id}>{p.raisonSociale}</option>)}
            </select>
          </div>
          <Button variant="primary" onClick={() => void fetchReport()} loading={loading}>Afficher</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard label="Recrutés" value={String(report?.totaux.nbreRecrut ?? 0)} delta={0} deltaLabel={report?.periode ?? ''} color="blue" />
        <KpiCard label="Réabonnés (réalisé)" value={String(report?.totaux.realise ?? 0)} delta={0} deltaLabel={type} color="green" />
        <KpiCard label="Taux de réabonnement" value={`${report?.totaux.taux ?? 0} %`} delta={0} deltaLabel="conversion" color="gold" />
        <KpiCard label="Reste à réaliser" value={String(report?.totaux.reste ?? 0)} delta={0} deltaLabel="non réabonnés" color="red" />
      </div>

      <Card>
        <div className="min-h-[420px]">
          <DataTable<Row>
            loading={loading}
            rows={rows as unknown as Row[]}
            totalsRow={totalsRow}
            searchable={false}
            exportTitle={`Suivi ${type} ${report?.periode ?? ''}`}
            emptyMessage="Aucun recrutement sur cette période"
            columns={[
              { key: 'date', label: 'Date recrut.', render: (v) => (String(v) === 'TOTAL' ? 'TOTAL' : v ? formatDate(String(v)) : '—') },
              { key: 'nbreRecrut', label: 'Nb recrut.', align: 'right' },
              { key: 'echeance', label: 'Échéance', render: (v) => (v ? formatDate(String(v)) : '—') },
              { key: 'realise', label: 'Total réalisé', align: 'right' },
              { key: 'taux', label: 'Taux', align: 'right', render: tauxCell },
              { key: 'reseau', label: 'Réabo Réseau', align: 'right' },
              { key: 'mobileMoney', label: 'Mobile Money', align: 'right' },
              { key: 'reste', label: 'Reste', align: 'right' },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
