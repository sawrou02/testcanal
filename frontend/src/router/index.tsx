import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { canAccessPage } from '../lib/nav'
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
import BaremesPage from '../pages/parametrage/BaremesPage'
import ObjectifsDistributeurPage from '../pages/parametrage/ObjectifsDistributeurPage'
import ObjectifsPdvPage from '../pages/parametrage/ObjectifsPdvPage'
import TauxRpePage from '../pages/analytique/TauxRpePage'
import GapKitPage from '../pages/accessoires/GapKitPage'
import ParabolesPage from '../pages/accessoires/ParabolesPage'
import SecurityPage from '../pages/parametrage/SecurityPage'
import EchangesPage from '../pages/echanges/EchangesPage'
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
import CaPdvPage from '../pages/analytique/CaPdvPage'
import ClassementPage from '../pages/analytique/ClassementPage'
import RapportGraphiquePage from '../pages/analytique/RapportGraphiquePage'
import PoidsFormulesPage from '../pages/analytique/PoidsFormulesPage'
import RecrutementUserPage from '../pages/analytique/RecrutementUserPage'
import ArpuPage from '../pages/analytique/ArpuPage'
import MaterielsVendusPage from '../pages/analytique/MaterielsVendusPage'
import AuditLogPage from '../pages/analytique/AuditLogPage'
import DepensesPage from '../pages/operations/DepensesPage'
import ObjectifsPage from '../pages/parametrage/ObjectifsPage'
import AccessoiresCataloguePage from '../pages/accessoires/CataloguePage'
import AccessoiresLivraisonPage from '../pages/accessoires/LivraisonPage'
import AccessoiresVentesPage from '../pages/accessoires/VentesPage'
import AccessoiresRetoursPage from '../pages/accessoires/RetoursPage'
import VadConsultationPage from '../pages/vad/ConsultationPage'
import VadLivraisonPage from '../pages/vad/LivraisonPage'
import VadVenteKitPage from '../pages/vad/VenteKitPage'
import CreditPage from '../pages/credit/CreditPage'
import ArretesPage from '../pages/operations/ArretesPage'
import AugmentationCautionPage from '../pages/operations/AugmentationCautionPage'
import InstallationsPage from '../pages/operations/InstallationsPage'
import ReaboMomoPage from '../pages/analytique/ReaboMomoPage'
import BddGlobalePage from '../pages/analytique/BddGlobalePage'
import RetourRpePage from '../pages/commercial/RetourRpePage'

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>Accès refusé</h2>
      <p className="text-sm max-w-md" style={{ color: 'var(--text-muted)' }}>
        Votre profil n’a pas la permission d’accéder à cette page. Contactez votre administrateur si besoin.
      </p>
      <a href="/" className="mt-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: 'var(--primary)' }}>
        Retour au tableau de bord
      </a>
    </div>
  )
}

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.user?.role)
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  // Verrouillage par rôle : peu importe comment on arrive (menu, lien, URL tapée).
  const parts = location.pathname.split('/').filter(Boolean)
  const pageId = parts[0] === 'app' ? parts[1] || '' : 'dashboard'
  const allowed = canAccessPage(role, pageId)
  return (
    <AppLayout>
      {allowed ? <Outlet /> : <AccessDenied />}
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
      { path: 'app/baremes', element: <BaremesPage /> },
      { path: 'app/objectifs-distributeur', element: <ObjectifsDistributeurPage /> },
      { path: 'app/objectifs-pdv', element: <ObjectifsPdvPage /> },
      { path: 'app/taux-rpe', element: <TauxRpePage /> },
      { path: 'app/gap-kit', element: <GapKitPage /> },
      { path: 'app/suivi-paraboles', element: <ParabolesPage /> },
      { path: 'app/securite', element: <SecurityPage /> },
      { path: 'app/echanges', element: <EchangesPage /> },
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

      // --- Analytique / Statistiques ---
      { path: 'app/rapport-graphique', element: <RapportGraphiquePage /> },
      { path: 'app/stat-ca-pdv', element: <CaPdvPage /> },
      { path: 'app/stat-classement', element: <ClassementPage /> },
      {
        path: 'app/stat-objectif-pdv',
        element: <CaPdvPage title="Suivi Objectif PDV & SR" />,
      },
      { path: 'app/poids-formules', element: <PoidsFormulesPage /> },
      { path: 'app/recap-recrutement', element: <PoidsFormulesPage /> },
      { path: 'app/recrut-formule-user', element: <RecrutementUserPage /> },
      { path: 'app/ana-rendement-users', element: <RecrutementUserPage /> },
      { path: 'app/arpu', element: <ArpuPage /> },
      { path: 'app/ana-materiels', element: <MaterielsVendusPage /> },
      { path: 'app/ana-recap-audit', element: <AuditLogPage /> },

      // --- Dépenses & Objectifs ---
      { path: 'app/depenses', element: <DepensesPage /> },
      { path: 'app/objectifs', element: <ObjectifsPage /> },

      // --- Gestion Accessoires ---
      {
        path: 'app/acc-consultation-entrepot',
        element: <AccessoiresCataloguePage title="Consultation stock Entrepôt" />,
      },
      {
        path: 'app/acc-appro-entrepot',
        element: <AccessoiresCataloguePage enableAppro title="Approvisionnement Entrepôt" />,
      },
      {
        path: 'app/acc-init-reseau',
        element: <AccessoiresLivraisonPage title="Initialisation stock Réseau" />,
      },
      { path: 'app/acc-livraison', element: <AccessoiresLivraisonPage title="Livraison" /> },
      {
        path: 'app/acc-consultation-reseau',
        element: <AccessoiresLivraisonPage readOnly title="Consultation stock Réseau" />,
      },
      { path: 'app/acc-suivi-ventes', element: <AccessoiresVentesPage /> },
      {
        path: 'app/acc-versement-pdv',
        element: <AccessoiresVentesPage title="Versement PDV / Ventes accessoires" />,
      },
      { path: 'app/acc-retour-defectueux', element: <AccessoiresRetoursPage /> },

      // --- Gestion des VAD ---
      { path: 'app/vad-consultation', element: <VadConsultationPage /> },
      { path: 'app/vad-init-stock', element: <VadLivraisonPage title="Initialisation stock VAD" /> },
      { path: 'app/vad-livraison', element: <VadLivraisonPage title="Livraison stock VAD" /> },
      { path: 'app/vad-vente-kit', element: <VadVenteKitPage /> },

      // --- A) Vues Suivi Commercial branchées sur données réelles ---
      { path: 'app/poids-boutiques', element: <CaPdvPage title="Poids des boutiques" /> },
      { path: 'app/liste-echus-com', element: <EchusPage /> },
      { path: 'app/dn-pdv', element: <PdvListePage /> },
      { path: 'app/stats-bienvenue', element: <BienvenuePage /> },
      { path: 'app/objectif-journalier', element: <ObjectifsPage /> },

      // --- A) Vues États Analytiques branchées sur données réelles ---
      { path: 'app/ana-recouvrement', element: <SuiviSoldePage /> },
      { path: 'app/ana-quotidien-pdv', element: <CaPdvPage title="Suivi quotidien PDV" /> },
      { path: 'app/ana-quotidien-users', element: <RecrutementUserPage title="Suivi quotidien USERS" /> },
      { path: 'app/ana-suivi-recrut', element: <RecrutementUserPage title="Suivi Recrutement" /> },
      { path: 'app/ana-suivi-reabo', element: <CaPdvPage title="Suivi Réabonnement" /> },
      { path: 'app/ana-objectifs-dist', element: <ObjectifsPage /> },
      { path: 'app/ana-objectifs-pdv', element: <ObjectifsPage /> },
      { path: 'app/ana-recap-objectif', element: <ObjectifsPage /> },
      { path: 'app/ana-recap-activites', element: <RapportActivitePage /> },

      // --- B) Gestion Crédit, Arrêtés, Caution, Installation ---
      { path: 'app/suivi-credit', element: <CreditPage /> },
      { path: 'app/rapport-dette', element: <CreditPage onlyDette /> },
      { path: 'app/arretes-soldes', element: <ArretesPage /> },
      { path: 'app/augmentation-caution', element: <AugmentationCautionPage /> },
      { path: 'app/suivi-installation', element: <InstallationsPage /> },
      { path: 'app/consultation-g11', element: <DecodeursPage type="G11" title="Consultation G11" /> },

      // --- B) Vues réelles supplémentaires ---
      { path: 'app/reabo-momo', element: <ReaboMomoPage /> },
      { path: 'app/bdd-globale', element: <BddGlobalePage /> },

      { path: 'app/retour-rpe', element: <RetourRpePage /> },

      { path: 'app/:pageId', element: <GenericTablePage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
