import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BrandStar } from '../ui/BrandStar'
import { Icon } from '../ui/Icon'
import { useAuthStore } from '../../store/authStore'
import { getRoleLabel, cn } from '../../lib/utils'
import { versementStats, listImmobilises, listAAE } from '../../lib/api'
import { visibleSections } from '../../lib/nav'

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const sections = useMemo(() => visibleSections(user?.role), [user?.role])
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(sections.filter((s) => s.defaultOpen).map((s) => s.id)),
  )

  const [counts, setCounts] = useState<{ versements: number; aae: number; immobilises: number }>({ versements: 0, aae: 0, immobilises: 0 })
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next = { versements: 0, aae: 0, immobilises: 0 }
      try { next.versements = (await versementStats()).enAttenteCount } catch { /* ignore */ }
      try { next.aae = (await listAAE(30)).length } catch { /* ignore */ }
      try { next.immobilises = (await listImmobilises()).length } catch { /* ignore */ }
      if (!cancelled) setCounts(next)
    })()
    return () => { cancelled = true }
  }, [])

  const sectionBadge: Record<string, number> = {
    operations: counts.versements,
    'service-abonnement': counts.aae,
    'logistique-sat': counts.immobilises,
  }
  const itemBadge: Record<string, number> = {
    'versement-banque': counts.versements,
    aae: counts.aae,
    'decodeurs-immobilises': counts.immobilises,
  }

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const currentPath = location.pathname
  useEffect(() => {
    const m = currentPath.match(/^\/app\/([^/]+)/)
    if (!m) return
    const sec = sections.find((s) => s.items.some((it) => it.id === m[1]))
    if (sec) setOpenSections((prev) => (prev.has(sec.id) ? prev : new Set(prev).add(sec.id)))
  }, [currentPath, sections])
  const isItemActive = (itemId: string) => currentPath === `/app/${itemId}`

  const initials = user
    ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase()
    : '??'

  return (
    <aside
      className="w-[266px] h-screen flex flex-col shrink-0 overflow-hidden"
      style={{ background: 'var(--sidebar-bg)', color: '#E8F0EA' }}
    >
      {/* Brand header */}
      <div className="flex items-center gap-3 px-4 py-4 shrink-0 border-b border-white/10">
        <BrandStar size={40} />
        <div>
          <div className="text-white font-black text-lg leading-tight tracking-wide">SENDISTRI</div>
          <div className="text-green-300/60 text-xs">ERP v1.0</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => {
          if (section.singleLink) {
            return (
              <Link
                key={section.id}
                to="/"
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-semibold transition-colors',
                  currentPath === '/'
                    ? 'bg-primary text-white'
                    : 'text-green-200/70 hover:bg-white/10 hover:text-white',
                )}
              >
                <span className="w-5 flex items-center justify-center"><Icon name={section.icon} size={18} /></span>
                <span>{section.label}</span>
              </Link>
            )
          }

          const isOpen = openSections.has(section.id)

          return (
            <div key={section.id} className="mb-0.5">
              <button
                onClick={() => toggleSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 mx-0 text-sm font-semibold transition-colors',
                  'text-green-200/70 hover:bg-white/10 hover:text-white',
                )}
              >
                <span className="w-5 flex items-center justify-center shrink-0"><Icon name={section.icon} size={18} /></span>
                <span className="flex-1 text-left">{section.label}</span>
                {sectionBadge[section.id] ? (
                  <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {sectionBadge[section.id]}
                  </span>
                ) : null}
                <svg
                  className={cn('w-3.5 h-3.5 shrink-0 transition-transform', isOpen && 'rotate-90')}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                </svg>
              </button>

              {isOpen && (
                <div className="ml-4 pl-5 border-l border-white/10 space-y-0.5 pb-1">
                  {section.items.map((item) => {
                    const active = isItemActive(item.id)
                    return (
                      <Link
                        key={item.id}
                        to={`/app/${item.id}`}
                        className={cn(
                          'flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors',
                          active
                            ? 'bg-primary text-white font-semibold'
                            : 'text-green-300/60 hover:bg-white/10 hover:text-green-100',
                        )}
                      >
                        <span>{item.label}</span>
                        {itemBadge[item.id] ? (
                          <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                            {itemBadge[item.id]}
                          </span>
                        ) : null}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="shrink-0 px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-semibold truncate">
              {user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}
            </div>
            <div className="text-green-300/60 text-xs truncate">
              {user ? getRoleLabel(user.role) : ''}
            </div>
          </div>
          <button
            onClick={logout}
            title="Déconnexion"
            className="shrink-0 text-green-300/60 hover:text-red-300 transition-colors p-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
