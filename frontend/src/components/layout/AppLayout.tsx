import { Header } from './Header'
import { TopNav } from './TopNav'
import { AlertBanners } from './AlertBanners'
import { HelpAssistant } from '../help/HelpAssistant'
import { LoadingBar } from '../ui/LoadingBar'
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
      <LoadingBar />
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{ background: 'var(--app-bg)' }}
      >
        <Header title={PAGE_TITLES[location.pathname] || title} />
        <TopNav />
        <AlertBanners />
        <main className="main-scroll flex-1 p-4 md:p-6">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      <HelpAssistant />
    </ToastProvider>
  )
}
