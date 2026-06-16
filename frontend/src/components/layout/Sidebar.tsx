import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BrandStar } from '../ui/BrandStar'
import { useAuthStore } from '../../store/authStore'
import { getRoleLabel, cn } from '../../lib/utils'
import type { NavSection } from '../../types'

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: '⊞',
    items: [],
    defaultOpen: true,
    singleLink: true,
  },
  {
    id: 'parametrage',
    label: 'Paramétrage',
    icon: '⚙',
    items: [
      { id: 'formules', label: 'Formules' },
      { id: 'entrepot', label: 'Entrepôts' },
      { id: 'periodes', label: 'Périodes' },
      { id: 'comptes-dist', label: 'Comptes Distributeur' },
      { id: 'pdv-comptes', label: 'Comptes PDV' },
      { id: 'pdv-liste', label: 'Liste PDV' },
      { id: 'reprise-soldes', label: 'Reprise Soldes' },
      { id: 'objectifs', label: 'Objectifs' },
      { id: 'bonus', label: 'Bonus' },
      { id: 'deduction-nq', label: 'Déduction NQ' },
      { id: 'chargement-mp1', label: 'Chargement MP1' },
      { id: 'banques', label: 'Banques' },
      { id: 'localites', label: 'Localités' },
      { id: 'vadeurs', label: 'Vadeurs' },
    ],
  },
  {
    id: 'operations',
    label: 'Opérations',
    icon: '◈',
    badge: 3,
    defaultOpen: true,
    items: [
      { id: 'rapport-activite', label: 'Rapport Activité' },
      { id: 'consultation-g11', label: 'Consultation G11' },
      { id: 'encaissement', label: 'Encaissement' },
      { id: 'matching', label: 'Matching' },
      { id: 'versement-banque', label: 'Versement Banque', badge: 3 },
      { id: 'retrait-banque', label: 'Retrait Banque' },
      { id: 'details-bancaires', label: 'Détails Bancaires' },
      { id: 'suivi-solde', label: 'Suivi Solde' },
      { id: 'arretes-soldes', label: 'Arrêtés Soldes' },
      { id: 'depenses', label: 'Dépenses' },
      { id: 'augmentation-caution', label: 'Augmentation Caution' },
      { id: 'suivi-installation', label: 'Suivi Installation' },
    ],
  },
  {
    id: 'gestion-credit',
    label: 'Gestion Crédit',
    icon: '₣',
    items: [
      { id: 'suivi-credit', label: 'Suivi Crédit' },
      { id: 'rapport-dette', label: 'Rapport Dette' },
    ],
  },
  {
    id: 'service-abonnement',
    label: 'Service Abonnement',
    icon: '◉',
    badge: 12,
    items: [
      { id: 'periode-recrutement', label: 'Période Recrutement' },
      { id: 'bienvenue-abonnes', label: 'Bienvenue Abonnés' },
      { id: 'abonnes-nonqual', label: 'Abonnés Non Qualifiés' },
      { id: 'suivi-mp', label: 'Suivi MP' },
      { id: 'aae', label: 'AAE', badge: 12 },
      { id: 'liste-echus', label: 'Liste Échus' },
    ],
  },
  {
    id: 'suivi-commercial',
    label: 'Suivi Commercial',
    icon: '📊',
    items: [
      { id: 'objectif-journalier', label: 'Objectif Journalier' },
      { id: 'retour-rpe', label: 'Retour RPE' },
      { id: 'performances-cc', label: 'Performances CC' },
      { id: 'stats-bienvenue', label: 'Stats Bienvenue' },
      { id: 'poids-formules', label: 'Poids Formules' },
      { id: 'recap-recrutement', label: 'Récap Recrutement' },
      { id: 'poids-boutiques', label: 'Poids Boutiques' },
      { id: 'liste-echus-com', label: 'Liste Échus' },
      { id: 'reabo-momo', label: 'Réabo MoMo' },
      { id: 'recrut-formule-user', label: 'Recrut. Formule/User' },
      { id: 'taux-rpe', label: 'Taux RPE' },
      { id: 'arpu', label: 'ARPU' },
      { id: 'dn-pdv', label: 'DN PDV' },
      { id: 'bdd-globale', label: 'BDD Globale' },
    ],
  },
  {
    id: 'logistique-sat',
    label: 'Logistique SAT',
    icon: '📦',
    badge: 5,
    items: [
      { id: 'commandes', label: 'Commandes' },
      { id: 'inventaire-entrepot', label: 'Inventaire Entrepôt' },
      { id: 'inventaire-pdv', label: 'Inventaire PDV' },
      { id: 'appro-entrepot', label: 'Appro Entrepôt' },
      { id: 'consultation-entrepot', label: 'Consultation Entrepôt' },
      { id: 'consultation-reseau', label: 'Consultation Réseau' },
      { id: 'livraison', label: 'Livraison' },
      { id: 'decodeurs-immobilises', label: 'Décodeurs Immobilisés', badge: 5 },
      { id: 'recherche-decodeur', label: 'Recherche Décodeur' },
      { id: 'suivi-paraboles', label: 'Suivi Paraboles' },
      { id: 'suivi-decodeurs', label: 'Suivi Décodeurs' },
      { id: 'recap-vente', label: 'Récap Vente' },
      { id: 'gap-kit', label: 'Gap Kit' },
      { id: 'maj-stock', label: 'MAJ Stock' },
    ],
  },
  {
    id: 'logistique-g11',
    label: 'Logistique G11',
    icon: '📡',
    items: [
      { id: 'g11-inventaire-entrepot', label: 'Inventaire Entrepôt' },
      { id: 'g11-inventaire-pdv', label: 'Inventaire PDV' },
      { id: 'g11-appro-entrepot', label: 'Appro Entrepôt' },
      { id: 'g11-consultation-entrepot', label: 'Consultation Entrepôt' },
      { id: 'g11-consultation-reseau', label: 'Consultation Réseau' },
      { id: 'g11-livraison', label: 'Livraison' },
      { id: 'g11-recherche', label: 'Recherche Décodeur' },
    ],
  },
  {
    id: 'gestion-accessoires',
    label: 'Gestion Accessoires',
    icon: '🔧',
    items: [
      { id: 'acc-appro-entrepot', label: 'Appro Entrepôt' },
      { id: 'acc-consultation-entrepot', label: 'Consultation Entrepôt' },
      { id: 'acc-init-reseau', label: 'Init Réseau' },
      { id: 'acc-consultation-reseau', label: 'Consultation Réseau' },
      { id: 'acc-livraison', label: 'Livraison' },
      { id: 'acc-suivi-ventes', label: 'Suivi Ventes' },
      { id: 'acc-versement-pdv', label: 'Versement PDV' },
      { id: 'acc-retour-defectueux', label: 'Retour Défectueux' },
    ],
  },
  {
    id: 'gestion-vad',
    label: 'Gestion des VAD',
    icon: '🤝',
    items: [
      { id: 'vad-init-stock', label: 'Init Stock' },
      { id: 'vad-livraison', label: 'Livraison' },
      { id: 'vad-vente-kit', label: 'Vente Kit' },
      { id: 'vad-consultation', label: 'Consultation' },
    ],
  },
  {
    id: 'etats-analytiques',
    label: 'États Analytiques',
    icon: '📈',
    items: [
      { id: 'ana-materiels', label: 'Matériels' },
      { id: 'ana-recap-activites', label: 'Récap Activités' },
      { id: 'ana-recap-audit', label: 'Récap Audit' },
      { id: 'ana-recouvrement', label: 'Recouvrement' },
      { id: 'ana-quotidien-pdv', label: 'Quotidien PDV' },
      { id: 'ana-rendement-users', label: 'Rendement Users' },
      { id: 'ana-quotidien-users', label: 'Quotidien Users' },
      { id: 'ana-installations', label: 'Installations' },
      { id: 'ana-suivi-recrut', label: 'Suivi Recrutement' },
      { id: 'ana-suivi-reabo', label: 'Suivi Réabonnement' },
      { id: 'ana-objectifs-dist', label: 'Objectifs Dist.' },
      { id: 'ana-objectifs-pdv', label: 'Objectifs PDV' },
      { id: 'ana-recap-objectif', label: 'Récap Objectif' },
      { id: 'ana-commissions', label: 'Commissions' },
    ],
  },
  {
    id: 'statistiques',
    label: 'Statistiques',
    icon: '📉',
    items: [
      { id: 'stat-objectif-pdv', label: 'Objectif PDV' },
      { id: 'stat-classement', label: 'Classement' },
      { id: 'stat-ca-pdv', label: 'CA PDV' },
    ],
  },
]

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(NAV_SECTIONS.filter((s) => s.defaultOpen).map((s) => s.id)),
  )

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const currentPath = location.pathname
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
        {NAV_SECTIONS.map((section) => {
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
                <span className="text-base w-5 text-center">{section.icon}</span>
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
                <span className="text-base w-5 text-center shrink-0">{section.icon}</span>
                <span className="flex-1 text-left">{section.label}</span>
                {section.badge ? (
                  <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {section.badge}
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
                        {item.badge ? (
                          <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                            {item.badge}
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
