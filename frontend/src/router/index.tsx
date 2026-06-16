import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AppLayout } from '../components/layout/AppLayout'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import GenericTablePage from '../pages/GenericTablePage'
import FormulesPage from '../pages/parametrage/FormulesPage'
import BanquesPage from '../pages/parametrage/BanquesPage'
import LocalitesPage from '../pages/parametrage/LocalitesPage'
import EntrepotsPage from '../pages/parametrage/EntrepotsPage'
import PdvListePage from '../pages/parametrage/PdvListePage'
import VadeursPage from '../pages/parametrage/VadeursPage'
import ComptesPdvPage from '../pages/parametrage/ComptesPdvPage'
import EncaissementPage from '../pages/operations/EncaissementPage'
import SuiviSoldePage from '../pages/operations/SuiviSoldePage'
import VersementsPage from '../pages/finances/VersementsPage'
import RetraitsPage from '../pages/finances/RetraitsPage'
import DetailsBancairesPage from '../pages/finances/DetailsBancairesPage'

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'app/formules', element: <FormulesPage /> },
      { path: 'app/banques', element: <BanquesPage /> },
      { path: 'app/localites', element: <LocalitesPage /> },
      { path: 'app/entrepot', element: <EntrepotsPage /> },
      { path: 'app/pdv-liste', element: <PdvListePage /> },
      { path: 'app/vadeurs', element: <VadeursPage /> },
      { path: 'app/pdv-comptes', element: <ComptesPdvPage /> },
      { path: 'app/encaissement', element: <EncaissementPage /> },
      { path: 'app/suivi-solde', element: <SuiviSoldePage /> },
      { path: 'app/versement-banque', element: <VersementsPage /> },
      { path: 'app/retrait-banque', element: <RetraitsPage /> },
      { path: 'app/details-bancaires', element: <DetailsBancairesPage /> },
      { path: 'app/:pageId', element: <GenericTablePage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
