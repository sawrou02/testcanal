import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { useResource } from '../../hooks/useResource'
import { formatFCFA, formatDate } from '../../lib/utils'
import { exportExcel } from '../../lib/export'
import { getBordereau, type BordereauResult } from '../../lib/api'

interface PdvLite { id: string; raisonSociale: string; code?: string }

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const monthLabel = (p: string) => {
  if (!/^\d{4}-\d{2}$/.test(p)) return p
  const [y, m] = p.split('-')
  const noms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  return `${noms[Number(m) - 1]} ${y}`
}

const NATURE_LABEL: Record<string, string> = {
  RECRUTEMENT: 'Recrutement',
  REABONNEMENT: 'Réabonnement',
  MIGRATION: 'Migration',
  IMPAYE: 'Impayé',
}

export default function BordereauPage() {
  const toast = useToast()
  const { data: pdvs } = useResource<PdvLite>('/pdvs')

  const [pdvId, setPdvId] = useState('')
  const [periode, setPeriode] = useState(currentMonth())
  const [data, setData] = useState<BordereauResult | null>(null)
  const [loading, setLoading] = useState(false)

  // Sélectionne le premier PDV dès que la liste arrive.
  useEffect(() => {
    if (!pdvId && pdvs.length > 0) setPdvId(pdvs[0].id)
  }, [pdvs, pdvId])

  const fetchData = useCallback(async (id: string, p: string) => {
    if (!id) return
    setLoading(true)
    try {
      setData(await getBordereau(id, p))
    } catch {
      toast.error('Erreur lors du chargement du bordereau')
      setData(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (pdvId) void fetchData(pdvId, periode)
  }, [pdvId, periode, fetchData])

  const exportExcelDetail = () => {
    if (!data) return
    void exportExcel({
      title: `Bordereau commission - ${data.pdv.raisonSociale} - ${data.periode}`,
      periode: monthLabel(data.periode),
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'numAbonne', label: 'N° Abonné' },
        { key: 'client', label: 'Client' },
        { key: 'nature', label: 'Nature' },
        { key: 'formule', label: 'Formule' },
        { key: 'montant', label: 'Montant', align: 'right' },
      ],
      rows: data.detail.map((d) => ({
        date: formatDate(d.date),
        numAbonne: d.numAbonne,
        client: d.client,
        nature: NATURE_LABEL[d.nature] ?? d.nature,
        formule: d.formule,
        montant: d.montant,
      })),
    })
  }

  return (
    <div className="space-y-4">
      {/* Barre d'action (non imprimée) */}
      <div className="flex items-end justify-between gap-3 flex-wrap no-print">
        <div>
          <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>Bordereau de commission</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Relevé de commission par point de vente — à remettre au partenaire</p>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <label className="flex flex-col text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Point de vente
            <select
              value={pdvId}
              onChange={(e) => setPdvId(e.target.value)}
              className="mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[200px]"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {pdvs.map((p) => <option key={p.id} value={p.id}>{p.raisonSociale}</option>)}
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Période
            <input
              type="month"
              value={periode}
              onChange={(e) => e.target.value && setPeriode(e.target.value)}
              className="mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </label>
          <Button variant="secondary" onClick={() => window.print()} disabled={!data}>Imprimer / PDF</Button>
          <Button variant="secondary" onClick={exportExcelDetail} disabled={!data}>Excel</Button>
        </div>
      </div>

      {/* Le bordereau (imprimable) */}
      <div id="bordereau-print" className="rounded-xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {loading ? (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>Chargement…</div>
        ) : !data ? (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>Sélectionnez un point de vente</div>
        ) : (
          <>
            {/* En-tête du document */}
            <div className="flex items-start justify-between gap-4 pb-4 mb-5 border-b-2" style={{ borderColor: 'var(--primary)' }}>
              <div>
                <p className="text-2xl font-black" style={{ color: 'var(--primary)' }}>SENDISTRI</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Bordereau de commission</p>
              </div>
              <div className="text-right">
                <p className="text-base font-black" style={{ color: 'var(--text)' }}>{data.pdv.raisonSociale}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Code : {data.pdv.code}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Période : {monthLabel(data.periode)}</p>
              </div>
            </div>

            {/* Récapitulatif des commissions */}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="py-2 font-semibold">Rubrique</th>
                  <th className="py-2 font-semibold text-right">Base</th>
                  <th className="py-2 font-semibold text-right">Taux</th>
                  <th className="py-2 font-semibold text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.resume.map((r) => (
                  <tr key={r.libelle} className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                    <td className="py-2">{r.libelle}</td>
                    <td className="py-2 text-right">
                      {r.uniteBase.startsWith('CA') ? formatFCFA(r.base) : `${r.base.toLocaleString('fr-FR')} ${r.uniteBase}`}
                    </td>
                    <td className="py-2 text-right">
                      {r.uniteTaux === '%' ? `${r.taux} %` : `${formatFCFA(r.taux)} ${r.uniteTaux}`}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold">{formatFCFA(r.montant)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="py-3 text-right font-black" style={{ color: 'var(--text)' }}>Commission nette à payer</td>
                  <td className="py-3 text-right">
                    <span className="text-xl font-black font-mono" style={{ color: 'var(--primary)' }}>{formatFCFA(data.comNette)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Détail des opérations */}
            <h3 className="text-sm font-bold mt-6 mb-2" style={{ color: 'var(--text)' }}>
              Détail des opérations ({data.detail.length}{data.detailTronque ? '+' : ''})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <th className="py-1.5 pr-3 font-semibold">Date</th>
                    <th className="py-1.5 pr-3 font-semibold">N° Abonné</th>
                    <th className="py-1.5 pr-3 font-semibold">Client</th>
                    <th className="py-1.5 pr-3 font-semibold">Nature</th>
                    <th className="py-1.5 pr-3 font-semibold">Formule</th>
                    <th className="py-1.5 font-semibold text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {data.detail.map((d, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                      <td className="py-1.5 pr-3">{formatDate(d.date)}</td>
                      <td className="py-1.5 pr-3 font-mono">{d.numAbonne}</td>
                      <td className="py-1.5 pr-3">{d.client}</td>
                      <td className="py-1.5 pr-3">{NATURE_LABEL[d.nature] ?? d.nature}</td>
                      <td className="py-1.5 pr-3">{d.formule}</td>
                      <td className="py-1.5 text-right font-mono">{formatFCFA(d.montant)}</td>
                    </tr>
                  ))}
                  {data.detail.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>Aucune opération sur cette période</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pied de signature (surtout à l'impression) */}
            <div className="flex justify-between gap-8 mt-10 pt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              <div>Signature distributeur<br /><br />__________________</div>
              <div className="text-right">Signature partenaire<br /><br />__________________</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
