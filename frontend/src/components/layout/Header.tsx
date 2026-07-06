import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandStar } from '../ui/BrandStar'
import { useThemeStore } from '../../hooks/useTheme'
import { useAuthStore } from '../../store/authStore'
import {
  listNotifications,
  markNotificationsRead,
  dismissNotification,
  searchGlobal,
  type NotificationRow,
  type SearchResults,
} from '../../lib/api'

interface HeaderProps {
  title?: string
}

const DOT: Record<NotificationRow['type'], string> = {
  URGENT: 'var(--danger)',
  WARN: 'var(--gold)',
  OK: 'var(--primary)',
}

export function Header({ title = 'Tableau de bord' }: HeaderProps) {
  const { theme, toggleTheme } = useThemeStore()
  const user = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const [results, setResults] = useState<SearchResults | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) { setResults(null); return }
    const t = setTimeout(() => {
      searchGlobal(q).then((r) => { setResults(r); setSearchOpen(true) }).catch(() => setResults(null))
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const goSearch = (path: string) => { setSearch(''); setResults(null); setSearchOpen(false); navigate(path) }
  const totalResults = results ? results.abonnes.length + results.pdvs.length + results.decodeurs.length : 0

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const initials = user
    ? `${(user.prenom?.[0] ?? '').toUpperCase()}${(user.nom?.[0] ?? '').toUpperCase()}` || '?'
    : '?'

  const load = async () => {
    try {
      const { items, unread } = await listNotifications()
      setItems(items)
      setUnread(unread)
    } catch {
      setItems([])
      setUnread(0)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  // close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      try {
        await markNotificationsRead()
        setUnread(0)
        setItems((prev) => prev.map((n) => ({ ...n, lu: true })))
      } catch {
        /* ignore */
      }
    }
  }

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id))
    try {
      await dismissNotification(id)
    } catch {
      void load()
    }
  }

  return (
    <header
      className="h-16 flex items-center gap-4 px-6 bg-white border-b border-app-border shrink-0"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <BrandStar size={34} />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-black text-app-text leading-tight tracking-wide">SENDISTRI</span>
          <h1 className="text-[11px] text-app-subtle truncate leading-tight">{title}</h1>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto relative" ref={searchRef}>
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Rechercher un abonné, PDV, décodeur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => results && setSearchOpen(true)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-app-border bg-app-bg focus:outline-none focus:ring-2 focus:ring-primary/20 text-app-text placeholder-app-subtle"
          style={{ background: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />
        {searchOpen && results && (
          <div className="absolute left-0 right-0 mt-2 rounded-xl border border-app-border shadow-lg z-50 overflow-hidden max-h-96 overflow-y-auto"
               style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            {totalResults === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-app-muted" style={{ color: 'var(--text-muted)' }}>Aucun résultat</div>
            ) : (
              <>
                {results.abonnes.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-app-subtle" style={{ color: 'var(--text-muted)' }}>Abonnés</div>
                    {results.abonnes.map((a) => (
                      <button key={a.id} onClick={() => goSearch('/app/bdd-globale')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm" style={{ color: 'var(--text)' }}>
                        <span className="font-mono">{a.numAbonne}</span> — {a.prenom} {a.nom}
                      </button>
                    ))}
                  </div>
                )}
                {results.pdvs.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-app-subtle" style={{ color: 'var(--text-muted)' }}>Points de vente</div>
                    {results.pdvs.map((p) => (
                      <button key={p.id} onClick={() => goSearch('/app/pdv-liste')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm" style={{ color: 'var(--text)' }}>
                        <span className="font-mono">{p.code}</span> — {p.raisonSociale}
                      </button>
                    ))}
                  </div>
                )}
                {results.decodeurs.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-app-subtle" style={{ color: 'var(--text-muted)' }}>Décodeurs</div>
                    {results.decodeurs.map((d) => (
                      <button key={d.id} onClick={() => goSearch('/app/recherche-decodeur')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm" style={{ color: 'var(--text)' }}>
                        <span className="font-mono">{d.numSerie}</span> — {d.type} · {d.statut}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          className="p-2 rounded-lg text-app-muted hover:bg-gray-100 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Notifications */}
        <div className="relative" ref={ref}>
          <button
            onClick={toggle}
            title="Notifications"
            className="relative p-2 rounded-lg text-app-muted hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-xl border border-app-border shadow-lg z-50 overflow-hidden"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="px-4 py-3 border-b border-app-border text-sm font-bold text-app-text" style={{ borderColor: 'var(--border)' }}>
                Notifications
              </div>
              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-app-muted" style={{ color: 'var(--text-muted)' }}>
                    Aucune notification
                  </div>
                ) : (
                  items.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-app-border last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: DOT[n.type] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-app-text" style={{ color: 'var(--text)' }}>{n.message}</p>
                        <p className="text-xs text-app-subtle mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {new Date(n.createdAt).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <button onClick={() => remove(n.id)} title="Ignorer" className="text-app-subtle hover:text-app-text text-sm shrink-0">×</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar (real initials) */}
        <div
          className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold"
          title={user ? `${user.prenom} ${user.nom}` : ''}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
