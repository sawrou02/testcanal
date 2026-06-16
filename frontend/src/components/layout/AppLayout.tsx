import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AlertBanners } from './AlertBanners'
import { useLocation } from 'react-router-dom'
import { ToastProvider } from '../ui/Toast'

interface AppLayoutProps {
  children: React.ReactNode
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Tableau de bord',
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const pathParts = location.pathname.split('/')
  const pageId = pathParts[pathParts.length - 1]

  const title = PAGE_TITLES[location.pathname] || pageId
    ? pageId
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    : 'Tableau de bord'

  return (
    <ToastProvider>
      <div
        className="flex h-screen overflow-hidden"
        style={{ background: 'var(--app-bg)' }}
      >
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header title={PAGE_TITLES[location.pathname] || title} />
          <AlertBanners />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
