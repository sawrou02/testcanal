import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useToast } from '../../components/ui/Toast'
import { formatDate } from '../../lib/utils'
import { rechercheDecodeur, type DecodeurDetail } from '../../lib/api'
import { Card, PageHeader, statutBadge, typeBadge } from './shared'

export default function RechercheDecodeurPage() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [decodeur, setDecodeur] = useState<DecodeurDetail | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await rechercheDecodeur(query.trim())
      setDecodeur(res.found ? res.decodeur : null)
      setSearched(true)
    } catch {
      toast.error('Erreur lors de la recherche')
      setDecodeur(null)
      setSearched(true)
    } finally {
      setSearching(false)
    }
  }

  const localisation = decodeur
    ? decodeur.entrepot?.nom ?? decodeur.pdv?.raisonSociale ?? '—'
    : '—'

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recherche Décodeur"
        subtitle="Localiser un décodeur par son numéro de série"
      />

      <Card>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSearch()
            }}
            placeholder="N° de série du décodeur…"
            className="flex-1 border border-app-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button variant="primary" loading={searching} onClick={() => void handleSearch()}>
            Rechercher
          </Button>
        </div>
      </Card>

      <div className="min-h-[18rem]">
        {decodeur ? (
          <Card>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-app-muted">N° série</div>
                <div className="text-lg font-bold font-mono text-app-text">
                  {decodeur.numSerie}
                </div>
              </div>
              {statutBadge(decodeur.statut)}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-app-muted mb-1">Type</div>
                <div>{typeBadge(decodeur.type)}</div>
              </div>
              <div>
                <div className="text-xs text-app-muted mb-1">Date d'entrée</div>
                <div className="text-app-text">
                  {decodeur.dateEntree ? formatDate(decodeur.dateEntree) : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-app-muted mb-1">Localisation</div>
                <div className="text-app-text font-medium">{localisation}</div>
              </div>
            </div>

            <div className="mt-5">
              <h4 className="text-sm font-bold text-app-text mb-2">
                Abonnés liés ({decodeur.abonnes.length})
              </h4>
              {decodeur.abonnes.length === 0 ? (
                <p className="text-sm text-app-muted">Aucun abonné lié à ce décodeur.</p>
              ) : (
                <div className="border border-app-border rounded-lg divide-y divide-app-border overflow-hidden">
                  {decodeur.abonnes.map((a) => (
                    <div
                      key={a.numAbonne}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-semibold text-app-text">
                          {[a.prenom, a.nom].filter(Boolean).join(' ') || '—'}
                        </div>
                        <div className="text-xs text-app-muted">N° {a.numAbonne}</div>
                      </div>
                      <Badge variant="neutral">{a.statut}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center text-center min-h-[18rem]">
            <div className="max-w-sm">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-app-text" style={{ color: 'var(--text)' }}>
                {searched ? 'Aucun décodeur trouvé' : 'Recherche de décodeur'}
              </h3>
              <p className="text-sm text-app-muted mt-1" style={{ color: 'var(--text-muted)' }}>
                {searched
                  ? 'Aucun décodeur ne correspond à ce numéro de série.'
                  : 'Saisissez un numéro de série puis lancez la recherche.'}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
