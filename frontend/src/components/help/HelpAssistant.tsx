import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { canAccessPage } from '../../lib/nav'
import { HELP_KB, CATEGORIES, type HelpEntry } from './helpKB'

/**
 * Assistant "mode d'emploi" — 100% HORS LIGNE.
 * Base de connaissances locale (helpKB) + recherche par mots-clés insensible
 * aux accents. Filtré par RÔLE : un utilisateur ne voit que les sujets dont
 * la page lui est autorisée (même source de vérité que le menu et les routes).
 */

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function score(words: string[], idx: { tokens: string[]; qNorm: string }): number {
  let s = 0
  for (const w of words) {
    if (idx.tokens.some((t) => t === w || t.startsWith(w) || w.startsWith(t))) s += 1
    if (idx.qNorm.includes(w)) s += 1
  }
  return s
}

/** Déduit l'identifiant de page depuis la route d'une fiche d'aide. */
function routePageId(route?: string): string | null {
  if (!route) return null
  if (route === '/') return 'dashboard'
  const m = route.match(/^\/app\/(.+)$/)
  return m ? m[1] : null
}

export function HelpAssistant() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const role = useAuthStore((s) => s.user?.role)

  // KB filtrée par rôle : une fiche liée à une page interdite est masquée.
  // Les fiches sans page (glossaire, aide générique) restent visibles par tous.
  const kb = useMemo(
    () => HELP_KB.filter((e) => {
      const pid = routePageId(e.route)
      return pid ? canAccessPage(role, pid) : true
    }),
    [role],
  )

  const indexed = useMemo(
    () => kb.map((e) => ({
      e,
      tokens: norm(e.q + ' ' + e.keywords).split(/\s+/).filter((t) => t.length >= 2),
      qNorm: norm(e.q),
    })),
    [kb],
  )

  const overview = useMemo(
    () => CATEGORIES.map((c) => kb.find((e) => e.cat === c)).filter(Boolean) as HelpEntry[],
    [kb],
  )

  const results = useMemo(() => {
    const q = norm(query).trim()
    if (!q) return overview
    const words = q.split(/\s+/).filter((w) => w.length >= 2)
    if (words.length === 0) return overview
    return indexed
      .map((idx) => ({ e: idx.e, s: score(words, idx) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((r) => r.e)
  }, [query, indexed, overview])

  const go = (route: string) => { setOpen(false); navigate(route) }

  return (
    <>
      <button
        onClick={() => { setOpen((v) => !v); setTimeout(() => inputRef.current?.focus(), 50) }}
        title="Aide — Comment ça marche ?"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105"
        style={{ background: 'var(--primary)' }}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /><circle cx="12" cy="12" r="10" /></svg>
        )}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-5 z-50 w-[390px] max-w-[92vw] rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', maxHeight: '72vh' }}
        >
          <div className="px-4 py-3 text-white" style={{ background: 'var(--primary)' }}>
            <div className="font-bold">💬 Assistant SENDISTRI</div>
            <div className="text-[11px] opacity-90">Pose ta question — fonctionne hors ligne</div>
          </div>

          <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpenId(null) }}
              placeholder="Ex. créer un abonné · dette · whatsapp · M+"
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ background: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="overflow-y-auto p-2" style={{ maxHeight: '52vh' }}>
            {!query && (
              <div className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Sujets fréquents
              </div>
            )}
            {results.length === 0 ? (
              <div className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
                Aucune réponse trouvée.<br />Essaie un autre mot (ex. « abonné », « dette », « SMS », « stock »).
              </div>
            ) : (
              results.map((e) => {
                const expanded = openId === e.id
                return (
                  <div key={e.id} className="mb-1.5 rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => setOpenId(expanded ? null : e.id)}
                      className="w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-2 hover:bg-primary/5"
                      style={{ color: 'var(--text)' }}
                    >
                      <span><span className="font-semibold">{e.q}</span>{!query && <span className="block text-[10px]" style={{ color: 'var(--text-muted)' }}>{e.cat}</span>}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{expanded ? '−' : '+'}</span>
                    </button>
                    {expanded && (
                      <div className="px-3 pb-3 text-sm" style={{ color: 'var(--text)' }}>
                        <ol className="list-decimal ml-4 space-y-1">
                          {e.steps.map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                        {e.note && (
                          <div className="mt-2 text-[12px] rounded-md px-2 py-1.5" style={{ background: 'var(--app-bg)', color: 'var(--text-muted)' }}>
                            ⚠️ {e.note}
                          </div>
                        )}
                        {e.route && (
                          <button onClick={() => go(e.route!)}
                            className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                            style={{ background: 'var(--primary)' }}>
                            {e.routeLabel || 'Ouvrir la page'} →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div className="px-3 py-2 text-[10px] border-t text-center" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Aide intégrée · fonctionne sans internet
          </div>
        </div>
      )}
    </>
  )
}
