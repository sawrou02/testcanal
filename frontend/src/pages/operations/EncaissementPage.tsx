import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { ReceiptModal } from '../../components/operations/ReceiptModal'
import { useResource } from '../../hooks/useResource'
import { searchAbonnes, createEncaissement } from '../../lib/api'
import type { Abonne, Encaissement } from '../../lib/api'
import { formatFCFA, formatDate, cn } from '../../lib/utils'

interface Formule {
  id: string
  code: string
  nomCommercial: string
  prixFormule: number
}

const NATURES: { value: string; label: string }[] = [
  { value: 'RECRUTEMENT', label: 'Recrutement' },
  { value: 'REABONNEMENT', label: 'Réabonnement' },
  { value: 'MIGRATION', label: 'Migration' },
]

const MODES: { value: string; label: string }[] = [
  { value: 'ESPECE', label: 'Espèce' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'VIREMENT', label: 'Virement' },
]

const MOIS_OPTIONS = [1, 2, 3, 6, 12, 24]

const PRICE_PREMIUM = 6000
const PRICE_INTL = 6000
const PRICE_TIMBRE = 100

interface OptionsState {
  premium: boolean
  intl: boolean
  timbre: boolean
}

export default function EncaissementPage() {
  const toast = useToast()
  const { data: formules } = useResource<Formule>('/formules')

  const [view, setView] = useState<'bureau' | 'terrain'>('bureau')

  // search
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Abonne[]>([])

  // form state
  const [selectedAbonne, setSelectedAbonne] = useState<Abonne | null>(null)
  const [nature, setNature] = useState<string>('REABONNEMENT')
  const [formuleId, setFormuleId] = useState<string>('')
  const [nbMois, setNbMois] = useState<number>(1)
  const [modePaiement, setModePaiement] = useState<string>('WAVE')
  const [options, setOptions] = useState<OptionsState>({
    premium: false,
    intl: false,
    timbre: false,
  })
  const [montantRecu, setMontantRecu] = useState<number>(0)

  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<Encaissement | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  // resolve the effective formule id (selection else abonné's else first)
  const effectiveFormuleId =
    formuleId || selectedAbonne?.formule.id || formules[0]?.id || ''

  const selectedFormule: Formule | null = useMemo(() => {
    if (selectedAbonne && effectiveFormuleId === selectedAbonne.formule.id) {
      return selectedAbonne.formule
    }
    return formules.find((f) => f.id === effectiveFormuleId) ?? null
  }, [formules, effectiveFormuleId, selectedAbonne])

  // derived amounts
  const base = (selectedFormule?.prixFormule ?? 0) * nbMois
  const optionsTotal =
    (options.premium ? PRICE_PREMIUM : 0) +
    (options.intl ? PRICE_INTL : 0) +
    (options.timbre ? PRICE_TIMBRE : 0)
  const montantTotal = base + optionsTotal
  const monnaie = montantRecu - montantTotal

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await searchAbonnes(query.trim())
      setResults(res)
    } catch {
      toast.error('Erreur lors de la recherche')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const selectAbonne = (a: Abonne) => {
    setSelectedAbonne(a)
    setFormuleId(a.formule.id)
    setResults([])
  }

  const toggleOption = (key: keyof OptionsState) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSubmit = async () => {
    if (monnaie < 0) {
      toast.error('Montant reçu insuffisant !')
      return
    }
    if (!selectedAbonne) {
      toast.error('Sélectionnez un abonné')
      return
    }
    setSubmitting(true)
    try {
      const created = await createEncaissement({
        abonneId: selectedAbonne.id,
        pdvId: selectedAbonne.pdv.id,
        formuleId: effectiveFormuleId,
        nature,
        nbMois,
        modePaiement,
        options,
        montantRecu,
      })
      setReceipt(created)
      setReceiptOpen(true)
      toast.success(
        created.nouvelleEcheance
          ? `Encaissement enregistré ✓ — abonné actif jusqu'au ${formatDate(created.nouvelleEcheance)}`
          : 'Encaissement enregistré ✓',
      )
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header + view toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-app-text" style={{ color: 'var(--text)' }}>
            Encaissement
          </h2>
          <p className="text-sm text-app-muted mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Recrutement, réabonnement et migration des abonnés
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
          <button
            onClick={() => setView('bureau')}
            className={cn(
              'px-3 py-1.5 text-sm font-semibold rounded-md transition-colors',
              view === 'bureau' ? 'bg-primary text-white' : 'text-app-muted hover:text-app-text',
            )}
          >
            Bureau
          </button>
          <button
            onClick={() => setView('terrain')}
            className={cn(
              'px-3 py-1.5 text-sm font-semibold rounded-md transition-colors',
              view === 'terrain' ? 'bg-primary text-white' : 'text-app-muted hover:text-app-text',
            )}
          >
            Terrain
          </button>
        </div>
      </div>

      {view === 'bureau' ? (
        <BureauView
          query={query}
          setQuery={setQuery}
          searching={searching}
          results={results}
          onSearch={handleSearch}
          selectedAbonne={selectedAbonne}
          onSelectAbonne={selectAbonne}
          nature={nature}
          setNature={setNature}
          formules={formules}
          effectiveFormuleId={effectiveFormuleId}
          setFormuleId={setFormuleId}
          nbMois={nbMois}
          setNbMois={setNbMois}
          modePaiement={modePaiement}
          setModePaiement={setModePaiement}
          options={options}
          toggleOption={toggleOption}
          selectedFormule={selectedFormule}
          base={base}
          montantTotal={montantTotal}
          montantRecu={montantRecu}
          setMontantRecu={setMontantRecu}
          monnaie={monnaie}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      ) : (
        <TerrainView
          query={query}
          setQuery={setQuery}
          searching={searching}
          results={results}
          onSearch={handleSearch}
          selectedAbonne={selectedAbonne}
          onSelectAbonne={selectAbonne}
          formules={formules}
          effectiveFormuleId={effectiveFormuleId}
          setFormuleId={setFormuleId}
          modePaiement={modePaiement}
          setModePaiement={setModePaiement}
          montantTotal={montantTotal}
          montantRecu={montantRecu}
          setMontantRecu={setMontantRecu}
          monnaie={monnaie}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      )}

      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        encaissement={receipt}
      />
    </div>
  )
}

// ----- Shared sub-components -----

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

function SearchBlock({
  query,
  setQuery,
  searching,
  results,
  onSearch,
  selectedAbonne,
  onSelectAbonne,
  compact,
}: {
  query: string
  setQuery: (v: string) => void
  searching: boolean
  results: Abonne[]
  onSearch: () => void
  selectedAbonne: Abonne | null
  onSelectAbonne: (a: Abonne) => void
  compact?: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch()
          }}
          placeholder="N° abonné, nom, téléphone..."
          className="flex-1 border border-app-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button variant="primary" size={compact ? 'sm' : 'md'} loading={searching} onClick={onSearch}>
          Rechercher
        </Button>
      </div>

      {results.length > 0 && (
        <div className="border border-app-border rounded-lg divide-y divide-app-border overflow-hidden">
          {results.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelectAbonne(a)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm font-semibold text-app-text">
                {a.prenom} {a.nom}
              </div>
              <div className="text-xs text-app-muted">
                N° {a.numAbonne} · {a.tel1} · {a.formule.code}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedAbonne && (
        <div className="rounded-lg border border-primary/30 bg-primary-light p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-primary-dark">
              {selectedAbonne.prenom} {selectedAbonne.nom}
            </span>
            <span className="text-xs font-semibold text-primary-dark">✓ Sélectionné</span>
          </div>
          <div className="mt-1 text-xs text-primary-dark/80 space-y-0.5">
            <div>N° abonné : {selectedAbonne.numAbonne}</div>
            <div>
              Formule : {selectedAbonne.formule.code} — {selectedAbonne.formule.nomCommercial}
            </div>
            <div>Échéance : {formatDate(selectedAbonne.dateEcheance)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToggleGroup({
  value,
  onChange,
  items,
  size = 'md',
}: {
  value: string
  onChange: (v: string) => void
  items: { value: string; label: string }[]
  size?: 'sm' | 'md'
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          onClick={() => onChange(it.value)}
          className={cn(
            'rounded-lg border font-semibold transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === it.value
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-app-text border-app-border hover:bg-gray-50',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

function OptionsChips({
  options,
  toggleOption,
}: {
  options: OptionsState
  toggleOption: (key: keyof OptionsState) => void
}) {
  const chips: { key: keyof OptionsState; label: string; price: number }[] = [
    { key: 'premium', label: 'Premium', price: PRICE_PREMIUM },
    { key: 'intl', label: 'International', price: PRICE_INTL },
    { key: 'timbre', label: 'Timbre', price: PRICE_TIMBRE },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => toggleOption(c.key)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
            options[c.key]
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-app-text border-app-border hover:bg-gray-50',
          )}
        >
          {c.label} <span className="opacity-80">+{c.price.toLocaleString('fr-FR')}</span>
        </button>
      ))}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-app-text block mb-1.5">{children}</label>
}

interface RecapProps {
  selectedFormule: Formule | null
  nbMois: number
  base: number
  options: OptionsState
  montantTotal: number
  montantRecu: number
  setMontantRecu: (v: number) => void
  monnaie: number
  submitting: boolean
  onSubmit: () => void
}

function Recap({
  selectedFormule,
  nbMois,
  base,
  options,
  montantTotal,
  montantRecu,
  setMontantRecu,
  monnaie,
  submitting,
  onSubmit,
}: RecapProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-app-text">Récapitulatif</h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-app-muted">
            {selectedFormule ? selectedFormule.code : 'Formule'} × {nbMois} mois
          </span>
          <span className="font-medium text-app-text">{formatFCFA(base)}</span>
        </div>
        {options.premium && (
          <div className="flex items-center justify-between">
            <span className="text-app-muted">Premium</span>
            <span className="font-medium text-app-text">+ {formatFCFA(PRICE_PREMIUM)}</span>
          </div>
        )}
        {options.intl && (
          <div className="flex items-center justify-between">
            <span className="text-app-muted">International</span>
            <span className="font-medium text-app-text">+ {formatFCFA(PRICE_INTL)}</span>
          </div>
        )}
        {options.timbre && (
          <div className="flex items-center justify-between">
            <span className="text-app-muted">Timbre</span>
            <span className="font-medium text-app-text">+ {formatFCFA(PRICE_TIMBRE)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-app-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-app-text">Montant total</span>
          <span className="text-2xl font-bold text-primary font-mono">{formatFCFA(montantTotal)}</span>
        </div>
      </div>

      <div>
        <FieldLabel>Montant reçu</FieldLabel>
        <input
          type="number"
          value={montantRecu === 0 ? '' : montantRecu}
          onChange={(e) => setMontantRecu(Number(e.target.value) || 0)}
          placeholder="0"
          className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-app-text">Monnaie rendue</span>
        <span className={cn('text-lg font-bold font-mono', monnaie >= 0 ? 'text-primary' : 'text-danger')}>
          {formatFCFA(monnaie)}
        </span>
      </div>

      <Button variant="primary" className="w-full" loading={submitting} onClick={onSubmit}>
        Enregistrer l'encaissement
      </Button>
    </div>
  )
}

// ----- Bureau view -----

interface BureauViewProps {
  query: string
  setQuery: (v: string) => void
  searching: boolean
  results: Abonne[]
  onSearch: () => void
  selectedAbonne: Abonne | null
  onSelectAbonne: (a: Abonne) => void
  nature: string
  setNature: (v: string) => void
  formules: Formule[]
  effectiveFormuleId: string
  setFormuleId: (v: string) => void
  nbMois: number
  setNbMois: (v: number) => void
  modePaiement: string
  setModePaiement: (v: string) => void
  options: OptionsState
  toggleOption: (key: keyof OptionsState) => void
  selectedFormule: Formule | null
  base: number
  montantTotal: number
  montantRecu: number
  setMontantRecu: (v: number) => void
  monnaie: number
  submitting: boolean
  onSubmit: () => void
}

function BureauView(p: BureauViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      {/* LEFT (2 cols) */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <h3 className="text-base font-bold text-app-text mb-3">Client</h3>
          <SearchBlock
            query={p.query}
            setQuery={p.setQuery}
            searching={p.searching}
            results={p.results}
            onSearch={p.onSearch}
            selectedAbonne={p.selectedAbonne}
            onSelectAbonne={p.onSelectAbonne}
          />
        </Card>

        <Card>
          <h3 className="text-base font-bold text-app-text mb-4">Détails de l'opération</h3>
          <div className="space-y-4">
            <div>
              <FieldLabel>PDV</FieldLabel>
              <div className="border border-app-border rounded-lg px-3 py-2 text-sm bg-gray-50 text-app-text">
                {p.selectedAbonne ? p.selectedAbonne.pdv.raisonSociale : '—'}
              </div>
            </div>

            <div>
              <FieldLabel>Type d'opération</FieldLabel>
              <ToggleGroup value={p.nature} onChange={p.setNature} items={NATURES} />
            </div>

            <div>
              <FieldLabel>Formule</FieldLabel>
              <select
                value={p.effectiveFormuleId}
                onChange={(e) => p.setFormuleId(e.target.value)}
                className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {p.formules.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} — {f.nomCommercial} ({formatFCFA(f.prixFormule)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Nombre de mois</FieldLabel>
              <select
                value={p.nbMois}
                onChange={(e) => p.setNbMois(Number(e.target.value))}
                className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {MOIS_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} mois
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Mode de paiement</FieldLabel>
              <ToggleGroup value={p.modePaiement} onChange={p.setModePaiement} items={MODES} />
            </div>

            <div>
              <FieldLabel>Options</FieldLabel>
              <OptionsChips options={p.options} toggleOption={p.toggleOption} />
            </div>
          </div>
        </Card>
      </div>

      {/* RIGHT (sticky recap) */}
      <div className="lg:sticky lg:top-4">
        <Card>
          <Recap
            selectedFormule={p.selectedFormule}
            nbMois={p.nbMois}
            base={p.base}
            options={p.options}
            montantTotal={p.montantTotal}
            montantRecu={p.montantRecu}
            setMontantRecu={p.setMontantRecu}
            monnaie={p.monnaie}
            submitting={p.submitting}
            onSubmit={p.onSubmit}
          />
        </Card>
      </div>
    </div>
  )
}

// ----- Terrain view -----

interface TerrainViewProps {
  query: string
  setQuery: (v: string) => void
  searching: boolean
  results: Abonne[]
  onSearch: () => void
  selectedAbonne: Abonne | null
  onSelectAbonne: (a: Abonne) => void
  formules: Formule[]
  effectiveFormuleId: string
  setFormuleId: (v: string) => void
  modePaiement: string
  setModePaiement: (v: string) => void
  montantTotal: number
  montantRecu: number
  setMontantRecu: (v: number) => void
  monnaie: number
  submitting: boolean
  onSubmit: () => void
}

function TerrainView(p: TerrainViewProps) {
  return (
    <div className="flex justify-center py-4">
      <div
        className="w-[340px] rounded-[2rem] bg-[#0B2A1B] p-3 shadow-xl"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <div className="rounded-[1.5rem] bg-white overflow-hidden">
          <div className="bg-primary text-white px-4 py-3 text-center">
            <div className="text-sm font-black tracking-wide">SENDISTRI Terrain</div>
            <div className="text-[11px] text-green-100">Encaissement mobile</div>
          </div>

          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Client */}
            <div>
              <FieldLabel>Client</FieldLabel>
              <SearchBlock
                query={p.query}
                setQuery={p.setQuery}
                searching={p.searching}
                results={p.results}
                onSearch={p.onSearch}
                selectedAbonne={p.selectedAbonne}
                onSelectAbonne={p.onSelectAbonne}
                compact
              />
            </div>

            {/* Formule */}
            <div>
              <FieldLabel>Formule</FieldLabel>
              <select
                value={p.effectiveFormuleId}
                onChange={(e) => p.setFormuleId(e.target.value)}
                className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {p.formules.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} — {f.nomCommercial}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode de paiement */}
            <div>
              <FieldLabel>Mode de paiement</FieldLabel>
              <ToggleGroup
                value={p.modePaiement}
                onChange={p.setModePaiement}
                items={MODES}
                size="sm"
              />
            </div>

            {/* Recap */}
            <div className="rounded-lg border border-app-border p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-app-muted">Montant total</span>
                <span className="font-bold text-primary font-mono">{formatFCFA(p.montantTotal)}</span>
              </div>
              <div>
                <FieldLabel>Montant reçu</FieldLabel>
                <input
                  type="number"
                  value={p.montantRecu === 0 ? '' : p.montantRecu}
                  onChange={(e) => p.setMontantRecu(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-app-muted">Monnaie rendue</span>
                <span
                  className={cn(
                    'font-bold font-mono',
                    p.monnaie >= 0 ? 'text-primary' : 'text-danger',
                  )}
                >
                  {formatFCFA(p.monnaie)}
                </span>
              </div>
            </div>

            <Button variant="primary" className="w-full" loading={p.submitting} onClick={p.onSubmit}>
              Encaisser {formatFCFA(p.montantTotal)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
