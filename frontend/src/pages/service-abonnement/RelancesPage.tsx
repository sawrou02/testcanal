import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { formatDate } from '../../lib/utils'
import { t } from '../../lib/locale'
import { listRelances, type RelanceRow, type RelancesData, type UrgenceRelance } from '../../lib/api'
import { Card, PageHeader, fullName, asRows, type Row } from './shared'
import { useSmsRelance } from './useSmsRelance'
import { WhatsAppButton, exportNumbers } from './relanceActions'

const HORIZONS = [7, 15, 30, 60]

/** Libellé + couleur d'urgence à partir des jours restants. */
function urgenceInfo(u: UrgenceRelance, jours: number): { label: string; variant: 'danger' | 'warning' | 'success' } {
  if (u === 'echu') return { label: `${t('Échu depuis')} ${Math.abs(jours)} ${t('j')}`, variant: 'danger' }
  if (u === 'urgent') return { label: jours === 0 ? t("Aujourd'hui") : `${t('Dans')} ${jours} ${t('j')}`, variant: 'warning' }
  return { label: `${t('Dans')} ${jours} ${t('j')}`, variant: 'success' }
}

type Filtre = 'all' | UrgenceRelance

/** Tuile-filtre cliquable du bandeau d'urgences. */
function FilterTile({
  active, onClick, label, value, accent,
}: { active: boolean; onClick: () => void; label: string; value: number; accent: string }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border p-4 transition-all"
      style={{
        background: active ? accent : 'var(--surface)',
        borderColor: active ? accent : 'var(--border)',
        boxShadow: active ? '0 2px 10px rgba(0,0,0,0.08)' : undefined,
      }}
    >
      <p className="text-sm font-medium mb-1" style={{ color: active ? '#fff' : 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-black leading-none" style={{ color: active ? '#fff' : 'var(--text)', fontFamily: 'IBM Plex Mono, monospace' }}>
        {value.toLocaleString('fr-FR')}
      </p>
    </button>
  )
}

export default function RelancesPage() {
  const toast = useToast()
  const { canSendSms, sending, sendSms } = useSmsRelance()

  const [jours, setJours] = useState(30)
  const [data, setData] = useState<RelancesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<Filtre>('all')

  const refetch = useCallback(async (j: number) => {
    setLoading(true)
    try {
      setData(await listRelances(j))
    } catch {
      toast.error(t('Erreur lors du chargement des relances'))
      setData(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void refetch(jours)
  }, [jours, refetch])

  const items = data?.items ?? []

  const filtered = useMemo(
    () => (filtre === 'all' ? items : items.filter((r) => r.urgence === filtre)),
    [items, filtre],
  )

  const c = data?.counts ?? { echus: 0, urgent: 0, avenir: 0, total: 0 }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <PageHeader
          title={t('Relances de réabonnement')}
          subtitle={t("Abonnés à relancer — des récemment échus jusqu'aux échéances à venir")}
        />
        <div className="flex items-end gap-2">
          <label className="flex flex-col text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {t('Horizon')}
            <select
              value={jours}
              onChange={(e) => setJours(Number(e.target.value))}
              className="mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {HORIZONS.map((h) => (
                <option key={h} value={h}>{h} {t('jours')}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Bandeau urgences (cliquable = filtre) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <FilterTile active={filtre === 'all'} onClick={() => setFiltre('all')} label={t('Total à relancer')} value={c.total} accent="#0E8A4F" />
        <FilterTile active={filtre === 'echu'} onClick={() => setFiltre('echu')} label={t('Déjà échus')} value={c.echus} accent="#D23A2C" />
        <FilterTile active={filtre === 'urgent'} onClick={() => setFiltre('urgent')} label={t('Urgent (≤ 7 j)')} value={c.urgent} accent="#E2A000" />
        <FilterTile active={filtre === 'avenir'} onClick={() => setFiltre('avenir')} label={t('À venir')} value={c.avenir} accent="#2563EB" />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>
            {filtre === 'all' ? t('Tous les abonnés à relancer') : filtre === 'echu' ? t('Abonnés déjà échus') : filtre === 'urgent' ? t('Urgents (≤ 7 jours)') : t('Échéances à venir')}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {filtered.length.toLocaleString('fr-FR')} {t('abonné(s)')}
            </span>
            <Button
              variant="secondary"
              onClick={() => exportNumbers(filtered, 'Numéros — Relances réabonnement')}
              disabled={filtered.length === 0}
            >
              {t('Exporter les numéros')}
            </Button>
            {canSendSms && (
              <Button
                onClick={() => void sendSms(filtered)}
                loading={sending}
                disabled={filtered.length === 0}
              >
                {t('Rappel SMS')} ({filtered.length})
              </Button>
            )}
          </div>
        </div>

        <DataTable<Row>
          loading={loading}
          rows={asRows(filtered)}
          emptyMessage={t('Aucun abonné à relancer sur cette période')}
          columns={[
            { key: 'numAbonne', label: t('N° Abonné') },
            { key: 'nom', label: t('Nom'), render: (_v, row) => fullName(row as unknown as RelanceRow) },
            { key: 'tel1', label: t('Téléphone') },
            {
              key: 'formule',
              label: t('Formule'),
              render: (_v, row) => (row as unknown as RelanceRow).formule?.nomCommercial ?? '-',
            },
            {
              key: 'dateEcheance',
              label: t('Échéance'),
              render: (v) => (v ? formatDate(String(v)) : '-'),
            },
            {
              key: 'urgence',
              label: t('Urgence'),
              render: (_v, row) => {
                const r = row as unknown as RelanceRow
                const info = urgenceInfo(r.urgence, r.joursRestants)
                return <Badge variant={info.variant}>{info.label}</Badge>
              },
            },
            {
              key: 'pdv',
              label: t('PDV'),
              render: (_v, row) => (row as unknown as RelanceRow).pdv?.raisonSociale ?? '-',
            },
            {
              key: '__wa',
              label: t('WhatsApp'),
              render: (_v, row) => <WhatsAppButton abonne={row as unknown as RelanceRow} />,
            },
          ]}
        />
      </Card>
    </div>
  )
}
