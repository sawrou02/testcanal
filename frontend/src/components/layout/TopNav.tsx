import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'
import { useLocale } from '../../lib/locale'
import { versementStats, listImmobilises, listAAE } from '../../lib/api'
import { visibleSections } from '../../lib/nav'

/**
 * Navigation HORIZONTALE en haut de l'écran, avec un méga-menu déroulant par
 * thème. Remplace la barre latérale gauche. Garde le filtrage par rôle et les
 * badges (versements en attente, AAE, décodeurs immobilisés).
 */
export function TopNav() {
  const { t } = useLocale()
  const location = useLocation()
  const role = useAuthStore((s) => s.user?.role)
  const sections = useMemo(() => visibleSections(role), [role])
  const [openId, setOpenId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const [counts, setCounts] = useState({ versements: 0, aae: 0, immobilises: 0 })
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
    operations: counts.versements, 'service-abonnement': counts.aae, 'logistique-sat': counts.immobilises,
  }
  const itemBadge: Record<string, number> = {
    'versement-banque': counts.versements, aae: counts.aae, 'decodeurs-immobilises': counts.immobilises,
  }

  const currentPath = location.pathname
  const activeSectionId = useMemo(() => {
    if (currentPath === '/' || currentPath === '') return 'dashboard'
    const m = currentPath.match(/^\/app\/([^/]+)/)
    if (!m) return null
    const direct = sections.find((s) => s.singleLink && s.id === m[1])
    if (direct) return direct.id
    return sections.find((s) => s.items.some((it) => it.id === m[1]))?.id ?? null
  }, [currentPath, sections])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpenId(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  useEffect(() => { setOpenId(null) }, [currentPath])

  const openSection = sections.find((s) => s.id === openId)

  return (
    <div ref={ref} className="relative shrink-0" style={{ background: 'var(--sidebar-bg)' }}>
      <div className="flex items-center gap-1 px-3 h-12 overflow-x-auto no-scrollbar">
        {sections.map((s) => {
          const active = activeSectionId === s.id
          const badge = sectionBadge[s.id] || 0
          const highlighted = active || openId === s.id
          if (s.singleLink) {
            return (
              <Link key={s.id} to={s.id === 'dashboard' ? '/' : `/app/${s.id}`}
                className={cn('flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors',
                  highlighted ? 'bg-primary text-white' : 'text-white/80 hover:bg-white/10 hover:text-white')}>
                <Icon name={s.icon} size={16} /><span>{t(s.label)}</span>
              </Link>
            )
          }
          return (
            <button key={s.id} onClick={() => setOpenId(openId === s.id ? null : s.id)}
              className={cn('relative flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors',
                highlighted ? 'bg-primary text-white' : 'text-white/80 hover:bg-white/10 hover:text-white')}>
              <Icon name={s.icon} size={16} /><span>{t(s.label)}</span>
              <svg className={cn('w-3 h-3 shrink-0 transition-transform', openId === s.id && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
              {badge > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">{badge}</span>
              )}
            </button>
          )
        })}
      </div>

      {openSection && !openSection.singleLink && (
        <div className="absolute left-0 right-0 top-full z-40 border-b shadow-2xl"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="max-w-[1600px] mx-auto px-4 py-4">
            {/* En-tête du méga-menu */}
            <div className="flex items-center gap-2.5 pb-3 mb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)', color: '#fff' }}>
                <Icon name={openSection.icon} size={17} />
              </span>
              <span className="text-sm font-black" style={{ color: 'var(--text)' }}>{t(openSection.label)}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {openSection.items.length} rubriques</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
              {openSection.items.map((it) => {
                const active = currentPath === `/app/${it.id}`
                const b = itemBadge[it.id] || 0
                return (
                  <Link key={it.id} to={`/app/${it.id}`}
                    className={cn('group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
                      active ? 'bg-primary text-white font-semibold' : 'hover:bg-primary/5 hover:pl-4')}
                    style={active ? undefined : { color: 'var(--text)' }}>
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
                      active ? 'bg-white' : 'bg-primary/40 group-hover:bg-primary')} />
                    <span className="truncate flex-1">{t(it.label)}</span>
                    {b > 0 && <span className="min-w-[18px] h-[18px] px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">{b}</span>}
                    <svg className={cn('w-3.5 h-3.5 shrink-0 transition-opacity', active ? 'opacity-90' : 'opacity-0 group-hover:opacity-60')}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
