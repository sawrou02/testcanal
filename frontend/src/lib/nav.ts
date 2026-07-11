import type { NavSection, Role } from '../types'

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: 'grid',
    items: [],
    defaultOpen: true,
    singleLink: true,
  },
  {
    id: 'echanges',
    label: 'Échanges',
    icon: 'send',
    items: [],
    singleLink: true,
  },
  {
    id: 'parametrage',
    label: 'Paramétrage',
    icon: 'sliders',
    items: [
      { id: 'formules', label: 'Formules' },
      { id: 'securite', label: 'Sécurité' },
      { id: 'config-sms', label: 'Passerelle SMS' },
      { id: 'baremes', label: 'Barèmes commissions' },
      { id: 'objectifs-distributeur', label: 'Objectifs Distributeur' },
      { id: 'objectifs-pdv', label: 'Objectifs PDV' },
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
    icon: 'receipt',
    defaultOpen: true,
    items: [
      { id: 'rapport-activite', label: 'Rapport Activité' },
      { id: 'consultation-g11', label: 'Consultation G11' },
      { id: 'encaissement', label: 'Encaissement' },
      { id: 'matching', label: 'Matching' },
      { id: 'versement-banque', label: 'Versement Banque' },
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
    icon: 'card',
    items: [
      { id: 'suivi-credit', label: 'Suivi Crédit' },
      { id: 'rapport-dette', label: 'Rapport Dette' },
    ],
  },
  {
    id: 'service-abonnement',
    label: 'Service Abonnement',
    icon: 'users',
    items: [
      { id: 'relances-reabo', label: 'Relances Réabo' },
      { id: 'periode-recrutement', label: 'Période Recrutement' },
      { id: 'bienvenue-abonnes', label: 'Bienvenue Abonnés' },
      { id: 'abonnes-nonqual', label: 'Abonnés Non Qualifiés' },
      { id: 'suivi-mp', label: 'Suivi MP' },
      { id: 'aae', label: 'AAE' },
      { id: 'liste-echus', label: 'Liste Échus' },
    ],
  },
  {
    id: 'suivi-commercial',
    label: 'Suivi Commercial',
    icon: 'trend',
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
    icon: 'package',
    items: [
      { id: 'commandes', label: 'Commandes' },
      { id: 'inventaire-entrepot', label: 'Inventaire Entrepôt' },
      { id: 'inventaire-pdv', label: 'Inventaire PDV' },
      { id: 'appro-entrepot', label: 'Appro Entrepôt' },
      { id: 'consultation-entrepot', label: 'Consultation Entrepôt' },
      { id: 'consultation-reseau', label: 'Consultation Réseau' },
      { id: 'livraison', label: 'Livraison' },
      { id: 'decodeurs-immobilises', label: 'Décodeurs Immobilisés' },
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
    icon: 'package',
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
    icon: 'layers',
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
    icon: 'pin',
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
    icon: 'bar',
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
    icon: 'pie',
    items: [
      { id: 'rapport-graphique', label: 'Rapport graphique' },
      { id: 'stat-objectif-pdv', label: 'Objectif PDV' },
      { id: 'stat-classement', label: 'Classement' },
      { id: 'stat-ca-pdv', label: 'CA PDV' },
    ],
  },
]


/** Sections visibles par rôle (filtrage du menu). Admin/Super Admin/Manager voient tout. */
const SECTION_ROLES: Record<string, Role[] | 'ALL'> = {
  dashboard: 'ALL',
  echanges: 'ALL',
  parametrage: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  operations: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE', 'COMMERCIAL', 'VENDEUR'],
  'gestion-credit': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE'],
  'service-abonnement': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VENDEUR'],
  'suivi-commercial': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMMERCIAL'],
  'logistique-sat': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LOGISTICIEN'],
  'logistique-g11': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LOGISTICIEN'],
  'gestion-accessoires': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LOGISTICIEN'],
  'gestion-vad': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LOGISTICIEN'],
  'etats-analytiques': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE'],
  statistiques: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMMERCIAL'],
}

/**
 * Restriction FINE par entrée (optionnelle). Une entrée listée ici n'est
 * visible/accessible que pour ces rôles, même si la section est plus large.
 * Permet ex. au vendeur/commercial de ne pas voir les écrans financiers.
 */
const ITEM_ROLES: Record<string, Role[]> = {
  // Opérations — écrans financiers réservés (pas vendeur ni commercial)
  matching: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE'],
  'versement-banque': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE'],
  'retrait-banque': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE'],
  'details-bancaires': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE'],
  'suivi-solde': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE'],
  'arretes-soldes': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE'],
  depenses: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE'],
  'augmentation-caution': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE'],
  'rapport-activite': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE'],
  'suivi-installation': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LOGISTICIEN', 'COMMERCIAL'],
  // Sécurité : réservé aux administrateurs
  securite: ['SUPER_ADMIN', 'ADMIN'],
  'config-sms': ['SUPER_ADMIN', 'ADMIN'],
}

function sectionAllowed(role: Role | undefined, sectionId: string): boolean {
  if (!role) return true
  const allowed = SECTION_ROLES[sectionId]
  return allowed === 'ALL' || (allowed?.includes(role) ?? false)
}

function itemAllowed(role: Role | undefined, sectionId: string, itemId: string): boolean {
  if (!role) return true
  if (!sectionAllowed(role, sectionId)) return false
  const fine = ITEM_ROLES[itemId]
  return fine ? fine.includes(role) : true
}

export function visibleSections(role?: Role): NavSection[] {
  const base = !role
    ? NAV_SECTIONS
    : NAV_SECTIONS.filter((s) => sectionAllowed(role, s.id))
  // Filtre aussi les entrées restreintes ; masque une section devenue vide.
  return base
    .map((s) => (s.singleLink ? s : { ...s, items: s.items.filter((it) => itemAllowed(role, s.id, it.id)) }))
    .filter((s) => s.singleLink || s.items.length > 0)
}

/** pageId -> sectionId (construit une seule fois depuis NAV_SECTIONS). */
const PAGE_SECTION: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const s of NAV_SECTIONS) for (const it of s.items) m[it.id] = s.id
  return m
})()

/**
 * Autorisation d'accès à une page selon le rôle — SOURCE UNIQUE de vérité,
 * utilisée à la fois pour verrouiller les routes et filtrer l'assistant.
 * - le tableau de bord est toujours accessible
 * - une page suit les droits de sa section, ET d'une éventuelle restriction fine
 * - une page non rattachée (générique) n'est pas restreinte
 */
export function canAccessPage(role: Role | undefined, pageId: string): boolean {
  if (!pageId || pageId === 'dashboard' || pageId === 'app') return true
  const sectionId = PAGE_SECTION[pageId]
  if (!sectionId) return true
  return itemAllowed(role, sectionId, pageId)
}

/** Liste à plat des pages navigables (pour la palette de commande). */
export interface NavPage { id: string; label: string; section: string; path: string }
export function navPages(role?: Role): NavPage[] {
  const out: NavPage[] = [{ id: 'dashboard', label: 'Tableau de bord', section: 'Général', path: '/' }]
  for (const s of visibleSections(role)) {
    if (s.singleLink) continue
    for (const it of s.items) out.push({ id: it.id, label: it.label, section: s.label, path: `/app/${it.id}` })
  }
  return out
}
