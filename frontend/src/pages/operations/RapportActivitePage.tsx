import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { DataTable } from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { SkeletonCardGrid } from '../../components/ui/Skeleton'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { useAuthStore } from '../../store/authStore'
import { formatFCFA, formatDate, cn } from '../../lib/utils'
import {
  listRapports,
  rapportStats,
  previewRapport,
  importRapport,
  matcherRapport,
  importCanal,
  type RapportActivite,
  type RapportStats,
  type RapportPreview,
  type CanalImportResult,
} from '../../lib/api'
import axios from 'axios'

const MUTATION_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE']

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('bg-white rounded-xl border border-app-border p-5 shadow-sm', className)}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}

function statutBadge(statut: RapportActivite['statutMatching']) {
  if (statut === 'MATCHE') return <Badge variant="success">Matché</Badge>
  if (statut === 'ECART') return <Badge variant="danger">Écart</Badge>
  return <Badge variant="warning">En attente</Badge>
}

type Tab = 'canal' | 'importation' | 'consultation'

export default function RapportActivitePage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUTATION_ROLES.includes(role) : false

  const [tab, setTab] = useState<Tab>('consultation')
  const [rows, setRows] = useState<RapportActivite[]>([])
  const [stats, setStats] = useState<RapportStats | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)

  const refetch = useCallback(async () => {
    setLoadingList(true)
    setLoadingStats(true)
    try {
      const [list, st] = await Promise.all([listRapports(), rapportStats()])
      setRows(list)
      setStats(st)
    } catch {
      toast.error('Erreur lors du chargement')
      setRows([])
      setStats(null)
    } finally {
      setLoadingList(false)
      setLoadingStats(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  // --- Importation state ---
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<RapportPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const extractError = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as { message?: string | string[] } | undefined
      if (data?.message) {
        return Array.isArray(data.message) ? data.message.join(', ') : data.message
      }
      return err.message
    }
    return err instanceof Error ? err.message : "Erreur lors de l'analyse du fichier"
  }

  const resetImport = () => {
    setFile(null)
    setPreview(null)
    setImportError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setPreview(null)
    setImportError(null)
    setFile(f)
    if (!f) return
    setPreviewing(true)
    try {
      const p = await previewRapport(f)
      setPreview(p)
    } catch (err) {
      setImportError(extractError(err))
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setImportError(null)
    try {
      const res = await importRapport(file)
      toast.success(`${res.joursImportes} jour(s) importé(s), ${res.joursIgnores} ignoré(s)`)
      resetImport()
      await refetch()
      setTab('consultation')
    } catch (err) {
      setImportError(extractError(err))
    } finally {
      setImporting(false)
    }
  }

  // --- Import CANAL (CSV détaillé) ---
  const canalRef = useRef<HTMLInputElement>(null)
  const [canalImporting, setCanalImporting] = useState(false)
  const [canalResult, setCanalResult] = useState<(CanalImportResult & { fichiers: number }) | null>(null)
  const [canalError, setCanalError] = useState<string | null>(null)

  const handleCanalFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setCanalImporting(true)
    setCanalError(null)
    setCanalResult(null)
    const agg: CanalImportResult & { fichiers: number } = {
      fichiers: 0, lignes: 0, transactions: 0, pdvs: 0, formules: 0, abonnesCrees: 0, encaissementsCrees: 0, montantTotal: 0,
    }
    try {
      for (const f of files) {
        const content = await f.text()
        const r = await importCanal(content)
        agg.fichiers += 1
        agg.lignes += r.lignes
        agg.transactions += r.transactions
        agg.pdvs = Math.max(agg.pdvs, r.pdvs)
        agg.formules = Math.max(agg.formules, r.formules)
        agg.abonnesCrees += r.abonnesCrees
        agg.encaissementsCrees += r.encaissementsCrees
        agg.montantTotal += r.montantTotal
      }
      setCanalResult(agg)
      toast.success(`Import terminé : ${agg.encaissementsCrees} encaissement(s), ${agg.abonnesCrees} abonné(s) créé(s) ✓`)
    } catch (err) {
      setCanalError(extractError(err))
    } finally {
      setCanalImporting(false)
      if (canalRef.current) canalRef.current.value = ''
    }
  }

  // --- Matching action ---
  const handleMatcher = async (id: string) => {
    try {
      await matcherRapport(id)
      toast.success('Rapport marqué comme matché ✓')
      await refetch()
    } catch {
      toast.error('Erreur lors du matching')
    }
  }

  type Row = RapportActivite & Record<string, unknown>

  const money = (v: unknown) => formatFCFA(Number(v) || 0)
  const num = (v: unknown) => (Number(v) || 0).toLocaleString('fr-FR')

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (_v: unknown, row: Row) => formatDate(row.date),
    },
    { key: 'montantTotal', label: 'Montant Total', align: 'right' as const, render: money },
    { key: 'sat', label: 'SAT', align: 'right' as const, render: money },
    { key: 'fibre', label: 'FIBRE', align: 'right' as const, render: money },
    { key: 'rex', label: 'REX', align: 'right' as const, render: money },
    { key: 'nbReabo', label: 'Nb REABO', align: 'right' as const, render: num },
    { key: 'caReabo', label: 'CA REABO', align: 'right' as const, render: money },
    { key: 'nbRecru', label: 'Nb RECRU', align: 'right' as const, render: num },
    { key: 'caFormule', label: 'CA Formule', align: 'right' as const, render: money },
    { key: 'caCreatZ4', label: 'CA Z4', align: 'right' as const, render: money },
    { key: 'caCreatGZ', label: 'CA GZ', align: 'right' as const, render: money },
    { key: 'caCreatG11', label: 'CA G11', align: 'right' as const, render: money },
    { key: 'caPayech', label: 'CA PAYECH', align: 'right' as const, render: money },
    { key: 'caAccessoires', label: 'CA Access', align: 'right' as const, render: money },
    {
      key: 'statutMatching',
      label: 'Statut',
      render: (_v: unknown, row: Row) => statutBadge(row.statutMatching),
    },
    {
      key: 'importeLe',
      label: 'Importé le',
      render: (_v: unknown, row: Row) => formatDate(row.importeLe),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_v: unknown, row: Row) => {
        if (row.statutMatching !== 'EN_ATTENTE' || !canMutate) return null
        return (
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation()
              void handleMatcher(row.id)
            }}
          >
            Marquer matché
          </Button>
        )
      },
    },
  ]

  const numericKeys: (keyof RapportActivite)[] = [
    'montantTotal',
    'sat',
    'fibre',
    'rex',
    'nbReabo',
    'caReabo',
    'nbRecru',
    'caFormule',
    'caCreatZ4',
    'caCreatGZ',
    'caCreatG11',
    'caPayech',
    'caAccessoires',
  ]

  const totalsRow = rows.length
    ? ({
        date: 'TOTAL',
        ...numericKeys.reduce(
          (acc, k) => {
            acc[k] = rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)
            return acc
          },
          {} as Record<string, number>,
        ),
      } as unknown as Partial<Row>)
    : undefined

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-app-text" style={{ color: 'var(--text)' }}>
          Rapport d'activité
        </h2>
        <p className="text-sm text-app-muted mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Importation et consultation des rapports d'activité journaliers
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingStats || !stats ? (
          <SkeletonCardGrid count={4} />
        ) : (
          <>
            <KpiCard
              label="Rapports importés"
              value={stats.count.toLocaleString('fr-FR')}
              delta={0}
              deltaLabel="au total"
              color="blue"
              icon="📄"
            />
            <KpiCard
              label="CA cumulé"
              value={formatFCFA(stats.caCumule)}
              delta={0}
              deltaLabel="tous rapports"
              color="green"
              icon="💰"
            />
            <KpiCard
              label="Matchés"
              value={stats.matches.toLocaleString('fr-FR')}
              delta={0}
              deltaLabel="rapprochés"
              color="green"
              icon="✅"
            />
            <KpiCard
              label="Écarts"
              value={stats.ecarts.toLocaleString('fr-FR')}
              delta={0}
              deltaLabel="à vérifier"
              color="red"
              icon="⚠️"
            />
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-app-border" style={{ borderColor: 'var(--border)' }}>
        {(['canal', 'importation', 'consultation'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-app-muted hover:text-app-text',
            )}
          >
            {t === 'canal' ? 'Import CANAL (CSV)' : t === 'importation' ? 'Import Excel' : 'Consultation'}
          </button>
        ))}
      </div>

      {tab === 'canal' ? (
        <Card>
          <div className="min-h-[420px] space-y-4">
            <div>
              <h3 className="text-base font-bold text-app-text" style={{ color: 'var(--text)' }}>Import du rapport détaillé CANAL</h3>
              <p className="text-sm text-app-muted mt-1" style={{ color: 'var(--text-muted)' }}>
                Déposez un ou plusieurs fichiers <span className="font-mono">.csv</span> (rapport d'activité distributeur détaillé).
                Le logiciel crée automatiquement les <b>PDV</b>, <b>formules</b>, <b>abonnés</b> et <b>encaissements</b>.
                Ré-importer le même fichier ne crée pas de doublon.
              </p>
            </div>

            {canMutate ? (
              <input
                ref={canalRef}
                type="file"
                accept=".csv,text/csv"
                multiple
                onChange={handleCanalFiles}
                disabled={canalImporting}
                className="block text-sm text-app-text file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-dark disabled:opacity-50"
              />
            ) : (
              <p className="text-sm text-app-muted">Vous n'avez pas la permission d'importer.</p>
            )}

            <div className="min-h-[200px]">
              {canalImporting && (
                <div className="flex items-center gap-3 text-sm text-app-muted">
                  <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Import en cours… (les gros fichiers peuvent prendre quelques secondes)
                </div>
              )}
              {!canalImporting && canalError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{canalError}</div>
              )}
              {!canalImporting && canalResult && (
                <div className="rounded-lg border border-app-border p-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-semibold text-primary-dark mb-3">✅ Import terminé — {canalResult.fichiers} fichier(s)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {([
                      ['Lignes lues', canalResult.lignes.toLocaleString('fr-FR')],
                      ['Transactions', canalResult.transactions.toLocaleString('fr-FR')],
                      ['Abonnés créés', canalResult.abonnesCrees.toLocaleString('fr-FR')],
                      ['Encaissements créés', canalResult.encaissementsCrees.toLocaleString('fr-FR')],
                      ['PDV', String(canalResult.pdvs)],
                      ['Montant total', formatFCFA(canalResult.montantTotal)],
                    ] as const).map(([label, val]) => (
                      <div key={label} className="rounded-lg bg-gray-50 p-3" style={{ background: 'var(--app-bg)' }}>
                        <p className="text-app-muted text-xs">{label}</p>
                        <p className="font-mono font-semibold text-app-text">{val}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-app-muted mt-3">
                    💡 Les données apparaissent dans « Base de données globale », les analyses et les commissions — par la <b>période</b> du rapport.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : tab === 'consultation' ? (
        <Card>
          <div className="min-h-[420px]">
            <DataTable
              columns={columns}
              rows={rows as Row[]}
              loading={loadingList}
              emptyMessage="Aucun rapport importé"
              totalsRow={totalsRow}
            />
          </div>
        </Card>
      ) : (
        <Card>
          <div className="min-h-[420px] space-y-4">
            <p className="text-sm text-app-muted" style={{ color: 'var(--text-muted)' }}>
              Sélectionnez un fichier Excel (.xlsx / .xls) de rapport d'activité. Un aperçu sera
              affiché avant la confirmation de l'import.
            </p>

            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={previewing || importing}
                className="block text-sm text-app-text file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-dark disabled:opacity-50"
              />
            </div>

            {/* Stable area to avoid layout jolt */}
            <div className="min-h-[220px]">
              {previewing && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              )}

              {!previewing && importError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  {importError}
                </div>
              )}

              {!previewing && !importError && preview && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-app-border p-4" style={{ borderColor: 'var(--border)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-app-muted">Fichier</span>
                        <span className="font-medium text-app-text truncate">{preview.fichier}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-app-muted">Lignes détectées</span>
                        <span className="font-medium font-mono text-app-text">
                          {preview.lignesDetectees.toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-app-muted">Montant total</span>
                        <span className="font-medium font-mono text-app-text">
                          {formatFCFA(preview.montantTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-app-muted">Jours concernés</span>
                        <span className="font-medium font-mono text-app-text">
                          {preview.jours.length.toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-app-border" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-app-muted mb-2">
                        Détail par type
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        {(
                          [
                            ['Recrutement', preview.parType.recrutement],
                            ['Réabonnement', preview.parType.reabonnement],
                            ['Migration', preview.parType.migration],
                          ] as const
                        ).map(([label, t]) => (
                          <div
                            key={label}
                            className="rounded-lg bg-gray-50 p-3"
                          >
                            <p className="text-app-muted text-xs">{label}</p>
                            <p className="font-mono font-semibold text-app-text">
                              {t.nb.toLocaleString('fr-FR')} ligne(s)
                            </p>
                            <p className="font-mono text-xs text-app-muted">{formatFCFA(t.montant)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button variant="primary" onClick={handleImport} loading={importing}>
                    Confirmer l'import
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
