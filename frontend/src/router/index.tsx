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
import RapportActivitePage from '../pages/operations/RapportActivitePage'
import MatchingPage from '../pages/operations/MatchingPage'
import VersementsPage from '../pages/finances/VersementsPage'
import RetraitsPage from '../pages/finances/RetraitsPage'
import DetailsBancairesPage from '../pages/finances/DetailsBancairesPage'
import CommissionsPage from '../pages/finances/CommissionsPage'
import AAEPage from '../pages/service-abonnement/AAEPage'
import EchusPage from '../pages/service-abonnement/EchusPage'
import NonQualifiesPage from '../pages/service-abonnement/NonQualifiesPage'
import SuiviMpPage from '../pages/service-abonnement/SuiviMpPage'
import BienvenuePage from '../pages/service-abonnement/BienvenuePage'
import RecrutementPage from '../pages/service-abonnement/RecrutementPage'
import InventairePage from '../pages/logistique/InventairePage'
import DecodeursPage from '../pages/logistique/DecodeursPage'
import RechercheDecodeurPage from '../pages/logistique/RechercheDecodeurPage'
import ImmobilisesPage from '../pages/logistique/ImmobilisesPage'
import MouvementsPage from '../pages/logistique/MouvementsPage'

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
      { path: 'app/rapport-activite', element: <RapportActivitePage /> },
      { path: 'app/matching', element: <MatchingPage /> },
      { path: 'app/ana-commissions', element: <CommissionsPage /> },
      { path: 'app/versement-banque', element: <VersementsPage /> },
      { path: 'app/retrait-banque', element: <RetraitsPage /> },
      { path: 'app/details-bancaires', element: <DetailsBancairesPage /> },
      { path: 'app/aae', element: <AAEPage /> },
      { path: 'app/liste-echus', element: <EchusPage /> },
      { path: 'app/abonnes-nonqual', element: <NonQualifiesPage /> },
      { path: 'app/suivi-mp', element: <SuiviMpPage /> },
      { path: 'app/bienvenue-abonnes', element: <BienvenuePage /> },
      { path: 'app/periode-recrutement', element: <RecrutementPage /> },

      // --- Logistique SAT ---
      {
        path: 'app/inventaire-entrepot',
        element: <InventairePage scope="entrepot" title="Inventaire Entrepôt" />,
      },
      {
        path: 'app/inventaire-pdv',
        element: <InventairePage scope="pdv" title="Inventaire PDV" />,
      },
      {
        path: 'app/consultation-entrepot',
        element: <DecodeursPage scope="entrepot" title="Consultation Entrepôt" />,
      },
      {
        path: 'app/consultation-reseau',
        element: <DecodeursPage scope="pdv" title="Consultation Réseau" />,
      },
      { path: 'app/recherche-decodeur', element: <RechercheDecodeurPage /> },
      {
        path: 'app/decodeurs-immobilises',
        element: <ImmobilisesPage title="Décodeurs Immobilisés" />,
      },
      { path: 'app/livraison', element: <MouvementsPage title="Livraison" /> },
      {
        path: 'app/appro-entrepot',
        element: <MouvementsPage title="Approvisionnement Entrepôt" />,
      },

      // --- Logistique G11 ---
      {
        path: 'app/g11-inventaire-entrepot',
        element: <InventairePage scope="entrepot" type="G11" title="Inventaire Entrepôt G11" />,
      },
      {
        path: 'app/g11-inventaire-pdv',
        element: <InventairePage scope="pdv" type="G11" title="Inventaire PDV G11" />,
      },
      {
        path: 'app/g11-consultation-entrepot',
        element: <DecodeursPage scope="entrepot" type="G11" title="Consultation Entrepôt G11" />,
      },
      {
        path: 'app/g11-consultation-reseau',
        element: <DecodeursPage scope="pdv" type="G11" title="Consultation Réseau G11" />,
      },
      { path: 'app/g11-recherche', element: <RechercheDecodeurPage /> },
      { path: 'app/g11-livraison', element: <MouvementsPage title="Livraison G11" /> },

      { path: 'app/:pageId', element: <GenericTablePage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
