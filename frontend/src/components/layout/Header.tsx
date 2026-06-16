import { useState } from 'react'
import { useThemeStore } from '../../hooks/useTheme'

interface HeaderProps {
  title?: string
}

export function Header({ title = 'Tableau de bord' }: HeaderProps) {
  const { theme, toggleTheme } = useThemeStore()
  const [search, setSearch] = useState('')

  return (
    <header
      className="h-16 flex items-center gap-4 px-6 bg-white border-b border-app-border shrink-0"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Breadcrumb/Title */}
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-app-subtle uppercase tracking-wider">SENDISTRI</span>
        <h1 className="text-base font-bold text-app-text truncate">{title}</h1>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-auto relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Rechercher dans SENDISTRI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-app-border bg-app-bg focus:outline-none focus:ring-2 focus:ring-primary/20 text-app-text placeholder-app-subtle"
          style={{ background: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />
      </div>

      {/* Right actions */}
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
        <button className="relative p-2 rounded-lg text-app-muted hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            5
          </span>
        </button>

        {/* User avatar */}
        <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
          AF
        </div>
      </div>
    </header>
  )
}
