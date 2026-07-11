import axios from 'axios'
import type { User, LoginResponse } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('sendistri-auth')
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { token?: string } }
      const token = parsed?.state?.token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  } catch {
    // ignore
  }
  return config
})

/* ------------------------------------------------------------------ *
 * Indicateur de chargement GLOBAL (barre en haut de l'écran).
 * On compte les requêtes en cours et on prévient les abonnés (LoadingBar).
 * ------------------------------------------------------------------ */
let activeRequests = 0
const loadingListeners = new Set<(n: number) => void>()
export const onLoadingChange = (cb: (n: number) => void): (() => void) => {
  loadingListeners.add(cb)
  return () => loadingListeners.delete(cb)
}
const notifyLoading = () => loadingListeners.forEach((l) => l(activeRequests))
const startRequest = () => { activeRequests += 1; notifyLoading() }
const endRequest = () => { activeRequests = Math.max(0, activeRequests - 1); notifyLoading() }

apiClient.interceptors.request.use((config) => {
  startRequest()
  return config
})

/**
 * - Suit le chargement (barre du haut).
 * - Réessai automatique et SILENCIEUX quand le serveur n'est pas encore prêt :
 *   au démarrage, les premières requêtes GET peuvent échouer (pas de réponse).
 *   On réessaie jusqu'à 6 fois (~10 s au total) avant d'abandonner. Une vraie
 *   erreur applicative (400/500) n'est PAS rejouée.
 */
const RETRY_DELAYS = [500, 800, 1200, 1800, 2500, 3500]
apiClient.interceptors.response.use(
  (response) => { endRequest(); return response },
  async (error) => {
    endRequest()
    const config = error?.config
    const noResponse = !error?.response // erreur réseau = serveur pas prêt
    const method = (config?.method || 'get').toLowerCase()
    if (config && noResponse && method === 'get') {
      const attempt = config.__retry || 0
      if (attempt < RETRY_DELAYS.length) {
        config.__retry = attempt + 1
        await new Promise((res) => setTimeout(res, RETRY_DELAYS[attempt]))
        return apiClient(config)
      }
    }
    return Promise.reject(error)
  },
)

export const login = async (
  email: string,
  password: string,
  captcha?: { captchaId: string; captchaAnswer: string },
): Promise<LoginResponse> => {
  const res = await apiClient.post<LoginResponse>('/auth/login', { email, password, ...(captcha || {}) })
  return res.data
}

export interface CaptchaChallenge { id: string; question: string }
export const getCaptcha = async (): Promise<CaptchaChallenge> =>
  (await apiClient.get<CaptchaChallenge>('/auth/captcha')).data

// ---- Sécurité (admin) ----
export interface SecurityEventRow { id: string; type: string; identifier?: string; ip: string; message?: string; createdAt: string }
export interface SecurityStats { failedToday: number; accessDeniedToday: number; lockedAccounts: number }
export const securityEvents = async (): Promise<SecurityEventRow[]> => {
  const res = await apiClient.get<SecurityEventRow[]>('/security/events'); return Array.isArray(res.data) ? res.data : []
}
export const securityStats = async (): Promise<SecurityStats> =>
  (await apiClient.get<SecurityStats>('/security/stats')).data

// ---- Import CANAL (rapport détaillé CSV) ----
export interface CanalImportResult {
  lignes: number; transactions: number; pdvs: number; formules: number
  abonnesCrees: number; encaissementsCrees: number; montantTotal: number
}
export const importCanal = async (content: string): Promise<CanalImportResult> =>
  (await apiClient.post<CanalImportResult>('/import/canal', { content })).data

// ---- Espace Documents & Échanges ----
function authToken(): string {
  try {
    const parsed = JSON.parse(localStorage.getItem('sendistri-auth') || '{}') as { state?: { token?: string } }
    return parsed?.state?.token || ''
  } catch { return '' }
}

export interface DocumentRow {
  id: string; filename: string; mimeType: string; size: number
  category: string; description?: string; uploadedByName: string; createdAt: string
}
export const listDocuments = async (category?: string): Promise<DocumentRow[]> => {
  const res = await apiClient.get<DocumentRow[]>('/documents', { params: category ? { category } : {} })
  return Array.isArray(res.data) ? res.data : []
}
export const uploadDocument = async (file: File, category: string, description: string): Promise<DocumentRow> => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('category', category)
  if (description) fd.append('description', description)
  const res = await fetch(`${BASE_URL}/api/documents`, {
    method: 'POST', headers: { Authorization: `Bearer ${authToken()}` }, body: fd,
  })
  if (!res.ok) throw new Error("Échec de l'envoi")
  return res.json()
}
export const downloadDocument = async (id: string, filename: string): Promise<void> => {
  const res = await fetch(`${BASE_URL}/api/documents/${id}/download`, {
    headers: { Authorization: `Bearer ${authToken()}` },
  })
  if (!res.ok) throw new Error('Téléchargement impossible')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
export const deleteDocument = async (id: string): Promise<void> => { await apiClient.delete(`/documents/${id}`) }
export const getDocumentText = async (id: string): Promise<string> => {
  const res = await fetch(`${BASE_URL}/api/documents/${id}/download`, {
    headers: { Authorization: `Bearer ${authToken()}` },
  })
  if (!res.ok) throw new Error('Lecture impossible')
  return res.text()
}

export interface MessageRow { id: string; userId: string; userName: string; content: string; createdAt: string }
export const listMessages = async (): Promise<MessageRow[]> => {
  const res = await apiClient.get<MessageRow[]>('/messages')
  return Array.isArray(res.data) ? res.data : []
}
export const postMessage = async (content: string): Promise<MessageRow> =>
  (await apiClient.post<MessageRow>('/messages', { content })).data
export const deleteMessage = async (id: string): Promise<void> => { await apiClient.delete(`/messages/${id}`) }

export const getMe = async (): Promise<User> => {
  const res = await apiClient.get<User>('/auth/me')
  return res.data
}

export interface DashboardStats {
  recrutementsCount: number
  reaboCount: number
  encaisseDuMois: number
  encaisseDuJour: number
  stockDecodeurs: number
  versementsEnAttente: number
  totalPDVs: number
  totalAbonnes: number
  activite30j: { date: string; recrut: number; reabo: number }[]
  soldesParSecteur: { secteur: string; ventes: number }[]
  deltas?: {
    encaisse: number | null
    recrutements: number | null
    reabo: number | null
  }
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await apiClient.get<DashboardStats>('/dashboard/stats')
  return res.data
}

// Generic CRUD helpers for referential resources
export const listResource = async <T>(path: string): Promise<T[]> => {
  const res = await apiClient.get<T[]>(path)
  return res.data
}

export const createResource = async <T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> => {
  const res = await apiClient.post<T>(path, body)
  return res.data
}

export const updateResource = async <T>(
  path: string,
  id: string | number,
  body: Record<string, unknown>,
): Promise<T> => {
  const res = await apiClient.patch<T>(`${path}/${id}`, body)
  return res.data
}

export const deleteResource = async (
  path: string,
  id: string | number,
): Promise<void> => {
  await apiClient.delete(`${path}/${id}`)
}

// ---- Encaissement / Abonnés ----

export interface Abonne {
  id: string
  numAbonne: string
  nom: string
  prenom: string
  tel1: string
  dateEcheance: string
  formule: { id: string; code: string; nomCommercial: string; prixFormule: number }
  pdv: { id: string; raisonSociale: string }
  decodeur: { numSerie: string; type: string } | null
}

export interface EncaissementOptions {
  premium: boolean
  intl: boolean
  timbre: boolean
}

export interface CreateEncaissementBody {
  abonneId: string
  pdvId: string
  formuleId: string
  nature: string
  nbMois: number
  modePaiement: string
  options: EncaissementOptions
  montantRecu: number
  datePaiement?: string
  numeroContrat?: string
  dateProchainRdv?: string
  tel2?: string
}

// ---- Barèmes de commission ----
export interface BaremeRow {
  id: string
  typeCommission: string
  libelle: string
  valeur: number
  unite: string
  actif: boolean
}
export const listBaremes = async (): Promise<BaremeRow[]> => {
  const res = await apiClient.get<BaremeRow[]>('/baremes')
  return Array.isArray(res.data) ? res.data : []
}
export const updateBaremes = async (
  items: { typeCommission: string; valeur: number; unite?: string; actif?: boolean }[],
): Promise<void> => {
  await apiClient.patch('/baremes', { items })
}

// ---- Objectifs Distributeur ----
export interface ObjDistRow {
  id: string
  annee: number
  trimestre?: number | null
  mois?: number | null
  formule: string
  typeObjectif: string
  effectif: number
}
export const listObjDist = async (): Promise<ObjDistRow[]> => {
  const res = await apiClient.get<ObjDistRow[]>('/objectifs-distributeur')
  return Array.isArray(res.data) ? res.data : []
}
export const createObjDist = async (b: Omit<ObjDistRow, 'id'>): Promise<ObjDistRow> =>
  (await apiClient.post('/objectifs-distributeur', b)).data
export const deleteObjDist = async (id: string): Promise<void> => {
  await apiClient.delete(`/objectifs-distributeur/${id}`)
}

// ---- Objectifs PDV ----
export interface ObjPdvRow {
  id: string
  pdvId: string
  annee: number
  mois: number
  typeObjectif: string
  effectif: number
  pdv?: { code: string; raisonSociale: string }
}
export const listObjPdv = async (): Promise<ObjPdvRow[]> => {
  const res = await apiClient.get<ObjPdvRow[]>('/objectifs-pdv')
  return Array.isArray(res.data) ? res.data : []
}
export const createObjPdv = async (
  b: { pdvId: string; annee: number; mois: number; typeObjectif: string; effectif: number },
): Promise<ObjPdvRow> => (await apiClient.post('/objectifs-pdv', b)).data
export const importObjPdv = async (
  items: { pdvId: string; annee: number; mois: number; typeObjectif: string; effectif: number }[],
): Promise<{ imported: number }> => (await apiClient.post('/objectifs-pdv/import', { items })).data
export const deleteObjPdv = async (id: string): Promise<void> => {
  await apiClient.delete(`/objectifs-pdv/${id}`)
}

// ---- Taux RPE ----
export interface TauxRpeRow { pdv: { code: string; raisonSociale: string }; nbEchus: number; nbReabo: number; taux: number }
export interface TauxRpeData { rows: TauxRpeRow[]; totaux: { nbEchus: number; nbReabo: number; taux: number } }
export const tauxRpe = async (): Promise<TauxRpeData> =>
  (await apiClient.get<TauxRpeData>('/service-abonnement/taux-rpe')).data

// ---- Suivi objectifs (dashboard) ----
export interface ObjSuiviPdv { pdv: string; secteur: string; objectif: number; realise: number; ro: number; reste: number }
export interface ObjSuiviSecteur { secteur: string; objectif: number; realise: number; ro: number; reste: number }
export const objectifsSuivi = async (): Promise<{ pdvs: ObjSuiviPdv[]; secteurs: ObjSuiviSecteur[] }> =>
  (await apiClient.get('/dashboard/objectifs-suivi')).data

// ---- Gap Kit ----
export interface GapKitRow {
  id: string; pdvId: string; clientNom?: string; numAbonne?: string
  kitVendu: string; elementsManquants: string; statut: string; date: string
  pdv?: { code: string; raisonSociale: string }
}
export const listGapKit = async (): Promise<GapKitRow[]> => {
  const res = await apiClient.get<GapKitRow[]>('/gap-kit'); return Array.isArray(res.data) ? res.data : []
}
export const createGapKit = async (b: { pdvId: string; clientNom?: string; numAbonne?: string; kitVendu: string; elementsManquants: string; statut?: string }): Promise<GapKitRow> =>
  (await apiClient.post('/gap-kit', b)).data
export const updateGapKit = async (id: string, b: Partial<GapKitRow>): Promise<GapKitRow> =>
  (await apiClient.patch(`/gap-kit/${id}`, b)).data
export const deleteGapKit = async (id: string): Promise<void> => { await apiClient.delete(`/gap-kit/${id}`) }

// ---- Paraboles ----
export interface ParaboleRow {
  id: string; pdvId: string; quantiteVendue: number; quantiteStock: number
  technicien?: string; date: string; pdv?: { code: string; raisonSociale: string }
}
export const listParaboles = async (): Promise<ParaboleRow[]> => {
  const res = await apiClient.get<ParaboleRow[]>('/paraboles'); return Array.isArray(res.data) ? res.data : []
}
export const createParabole = async (b: { pdvId: string; quantiteVendue: number; quantiteStock?: number; technicien?: string }): Promise<ParaboleRow> =>
  (await apiClient.post('/paraboles', b)).data
export const deleteParabole = async (id: string): Promise<void> => { await apiClient.delete(`/paraboles/${id}`) }

export interface Encaissement {
  id: string
  recuNumero: string
  montantTotal: number
  montantRecu: number
  monnaieRendue: number
  nature: string
  nbMois: number
  modePaiement: string
  date: string
  abonne: { numAbonne: string; nom: string; prenom: string }
  pdv: { raisonSociale: string }
  formule: { code: string; nomCommercial: string }
  user: { prenom: string; nom: string }
  nouvelleEcheance?: string
}

export const searchAbonnes = async (q: string): Promise<Abonne[]> => {
  const res = await apiClient.get<Abonne[]>('/abonnes', { params: { q } })
  return Array.isArray(res.data) ? res.data : []
}

export interface AbonneInput {
  numAbonne?: string
  nom: string
  prenom: string
  tel1: string
  tel2?: string
  formuleId: string
  pdvId: string
  dateEcheance?: string
  statut?: string
}

export const createAbonne = async (body: AbonneInput): Promise<Abonne> => {
  const res = await apiClient.post<Abonne>('/abonnes', body)
  return res.data
}

export const updateAbonne = async (
  id: string,
  body: Partial<AbonneInput>,
): Promise<Abonne> => {
  const res = await apiClient.patch<Abonne>(`/abonnes/${id}`, body)
  return res.data
}

export const deleteAbonne = async (id: string): Promise<void> => {
  await apiClient.delete(`/abonnes/${id}`)
}

export const createEncaissement = async (
  body: CreateEncaissementBody,
): Promise<Encaissement> => {
  const res = await apiClient.post<Encaissement>('/encaissements', body)
  return res.data
}

// ---- Finances: Versements / Retraits / Opérations bancaires ----

export type MouvementStatut = 'ENATTENTE' | 'VALIDE' | 'REJETE'

export interface Versement {
  id: string
  numBordereau: string
  pdvId: string
  pdv: { code: string; raisonSociale: string }
  montant: number
  banqueId: string
  banqueNom: string
  dateVersement: string
  periode: string
  libelle: string
  statut: MouvementStatut
  motifRejet?: string
}

// Retraits share the same shape as versements.
export type Retrait = Versement

export interface MouvementStats {
  validesMontantMois: number
  enAttenteCount: number
  rejeteCount: number
  totalCount: number
}

export interface CreateVersementBody {
  pdvId: string
  montant: number
  banqueId: string
  dateVersement: string
  periode: string
  libelle: string
  numBordereau: string
  photoBordereau?: string
}

export type CreateRetraitBody = CreateVersementBody

export interface OperationBancaire {
  id: string
  date: string
  type: 'VERSEMENT' | 'RETRAIT'
  sens: 'CREDIT' | 'DEBIT'
  pdv: { raisonSociale: string }
  banqueNom: string
  montant: number
  statut: MouvementStatut
}

// --- Versements ---

export const listVersements = async (statut?: MouvementStatut): Promise<Versement[]> => {
  const res = await apiClient.get<Versement[]>('/versements', {
    params: statut ? { statut } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}

export const versementStats = async (): Promise<MouvementStats> => {
  const res = await apiClient.get<MouvementStats>('/versements/stats')
  return res.data
}

export const createVersement = async (body: CreateVersementBody): Promise<Versement> => {
  const res = await apiClient.post<Versement>('/versements', body)
  return res.data
}

export const validerVersement = async (id: string): Promise<Versement> => {
  const res = await apiClient.patch<Versement>(`/versements/${id}/valider`)
  return res.data
}

export const rejeterVersement = async (id: string, motifRejet: string): Promise<Versement> => {
  const res = await apiClient.patch<Versement>(`/versements/${id}/rejeter`, { motifRejet })
  return res.data
}

// --- Retraits ---

export const listRetraits = async (statut?: MouvementStatut): Promise<Retrait[]> => {
  const res = await apiClient.get<Retrait[]>('/retraits', {
    params: statut ? { statut } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}

export const retraitStats = async (): Promise<MouvementStats> => {
  const res = await apiClient.get<MouvementStats>('/retraits/stats')
  return res.data
}

export const createRetrait = async (body: CreateRetraitBody): Promise<Retrait> => {
  const res = await apiClient.post<Retrait>('/retraits', body)
  return res.data
}

export const validerRetrait = async (id: string): Promise<Retrait> => {
  const res = await apiClient.patch<Retrait>(`/retraits/${id}/valider`)
  return res.data
}

export const rejeterRetrait = async (id: string, motifRejet: string): Promise<Retrait> => {
  const res = await apiClient.patch<Retrait>(`/retraits/${id}/rejeter`, { motifRejet })
  return res.data
}

// --- Opérations bancaires ---

export const listOperationsBancaires = async (): Promise<OperationBancaire[]> => {
  const res = await apiClient.get<OperationBancaire[]>('/operations-bancaires')
  return Array.isArray(res.data) ? res.data : []
}

// ---- Rapport d'activité ----

export type StatutMatching = 'EN_ATTENTE' | 'MATCHE' | 'ECART'

export interface RapportActivite {
  id: string
  date: string
  fichierImporte: string
  montantTotal: number
  sat: number
  fibre: number
  rex: number
  nbReabo: number
  caReabo: number
  nbRecru: number
  caFormule: number
  caCreatZ4: number
  caCreatGZ: number
  caCreatG11: number
  caPayech: number
  caAccessoires: number
  statutMatching: StatutMatching
  importeLe: string
  importePar: { prenom: string; nom: string }
}

export interface RapportStats {
  count: number
  caCumule: number
  matches: number
  ecarts: number
  enAttente: number
}

export interface RapportPreview {
  fichier: string
  lignesDetectees: number
  montantTotal: number
  parType: {
    recrutement: { nb: number; montant: number }
    reabonnement: { nb: number; montant: number }
    migration: { nb: number; montant: number }
  }
  jours: string[]
}

export interface RapportImportResult {
  fichier: string
  joursImportes: number
  joursIgnores: number
  lignesDetectees: number
  montantTotal: number
}

export const listRapports = async (): Promise<RapportActivite[]> => {
  const res = await apiClient.get<RapportActivite[]>('/rapports')
  return Array.isArray(res.data) ? res.data : []
}

export const rapportStats = async (): Promise<RapportStats> => {
  const res = await apiClient.get<RapportStats>('/rapports/stats')
  return res.data
}

export const previewRapport = async (file: File): Promise<RapportPreview> => {
  const form = new FormData()
  form.append('file', file)
  const res = await apiClient.post<RapportPreview>('/rapports/preview', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export const importRapport = async (file: File): Promise<RapportImportResult> => {
  const form = new FormData()
  form.append('file', file)
  const res = await apiClient.post<RapportImportResult>('/rapports/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export const matcherRapport = async (id: string): Promise<RapportActivite> => {
  const res = await apiClient.patch<RapportActivite>(`/rapports/${id}/matcher`)
  return res.data
}

// ---- Matching ----

export interface MatchingLigne {
  libelle: string
  rapport: number
  encaisse: number
  ecart: number
}

export interface MatchingResult {
  date: string
  rapportId: string | null
  found: boolean
  statutMatching: string
  lignes: MatchingLigne[]
}

export const getMatching = async (date: string): Promise<MatchingResult> => {
  const res = await apiClient.get<MatchingResult>('/matching', { params: { date } })
  return res.data
}

// ---- Commissions ----

export interface CommissionParams {
  bonusMateriel: number
  tauxFormule: number
  tauxReabo: number
  primeMigration: number
  deductionParNonQualifie: number
}

export interface CommissionLigne {
  pdv: { code: string; raisonSociale: string }
  nbRecru: number
  caRecru: number
  nbReabo: number
  caReabo: number
  nbMigration: number
  comRecrutement: number
  comFormule: number
  comReabo: number
  primeMigration: number
  comNette: number
}

export interface CommissionTotaux {
  comBrute: number
  deductions: number
  comNette: number
  partenaires: number
}

export interface CommissionsResult {
  periode: string
  params: CommissionParams
  lignes: CommissionLigne[]
  totaux: CommissionTotaux
}

export const getCommissions = async (periode?: string): Promise<CommissionsResult> => {
  const res = await apiClient.get<CommissionsResult>('/commissions', {
    params: periode ? { periode } : undefined,
  })
  return res.data
}

export interface BordereauResumeLigne {
  libelle: string
  base: number
  uniteBase: string
  taux: number
  uniteTaux: string
  montant: number
}
export interface BordereauDetailLigne {
  date: string
  numAbonne: string
  client: string
  nature: string
  formule: string
  montant: number
}
export interface BordereauResult {
  periode: string
  pdv: { code: string; raisonSociale: string }
  compteurs: { nbRecru: number; caRecru: number; nbReabo: number; caReabo: number; nbMigration: number; nbG11: number }
  resume: BordereauResumeLigne[]
  comNette: number
  detail: BordereauDetailLigne[]
  detailTronque: boolean
}

export const getBordereau = async (pdvId: string, periode?: string): Promise<BordereauResult | null> => {
  const res = await apiClient.get<BordereauResult | null>('/commissions/bordereau', {
    params: { pdvId, ...(periode ? { periode } : {}) },
  })
  return res.data ?? null
}

// ---- Service Abonnement ----

export type StatutAbonne = 'ACTIF' | 'ECHU' | 'SUSPENDU' | 'RESILIE'

export interface AbonneRow {
  id: string
  numAbonne: string
  nom: string
  prenom: string
  tel1: string
  dateEcheance: string
  statut: StatutAbonne
  formule: { code: string; nomCommercial: string }
  pdv: { raisonSociale: string }
  motif?: string
  niveau?: string
  dateRecrutement?: string
}

export interface RecrutementRow {
  id: string
  date: string
  montantTotal: number
  abonne: { numAbonne: string; nom: string; prenom: string }
  formule: { code: string; nomCommercial: string }
  pdv: { raisonSociale: string }
}

export interface ServiceAbonnementStats {
  total: number
  actifs: number
  echus: number
  suspendus: number
  resilies: number
  aae30: number
  arpu: number
  tauxReabo: number
}

export const serviceAbonnementStats = async (): Promise<ServiceAbonnementStats> => {
  const res = await apiClient.get<ServiceAbonnementStats>('/service-abonnement/stats')
  return res.data
}

export const listAAE = async (jours?: number): Promise<AbonneRow[]> => {
  const res = await apiClient.get<AbonneRow[]>('/service-abonnement/aae', {
    params: jours !== undefined ? { jours } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}

export const listEchus = async (): Promise<AbonneRow[]> => {
  const res = await apiClient.get<AbonneRow[]>('/service-abonnement/echus')
  return Array.isArray(res.data) ? res.data : []
}

export type UrgenceRelance = 'echu' | 'urgent' | 'avenir'
export interface RelanceRow extends AbonneRow {
  joursRestants: number
  urgence: UrgenceRelance
}
export interface RelancesData {
  jours: number
  passe: number
  counts: { echus: number; urgent: number; avenir: number; total: number }
  items: RelanceRow[]
}

const EMPTY_RELANCES: RelancesData = {
  jours: 30,
  passe: 30,
  counts: { echus: 0, urgent: 0, avenir: 0, total: 0 },
  items: [],
}

export const listRelances = async (jours?: number): Promise<RelancesData> => {
  const res = await apiClient.get<RelancesData>('/service-abonnement/relances', {
    params: jours !== undefined ? { jours } : undefined,
  })
  return res.data && Array.isArray(res.data.items) ? res.data : EMPTY_RELANCES
}

export const listNonQualifies = async (): Promise<AbonneRow[]> => {
  const res = await apiClient.get<AbonneRow[]>('/service-abonnement/non-qualifies')
  return Array.isArray(res.data) ? res.data : []
}

export const listSuiviMp = async (): Promise<AbonneRow[]> => {
  const res = await apiClient.get<AbonneRow[]>('/service-abonnement/suivi-mp')
  return Array.isArray(res.data) ? res.data : []
}

export const listBienvenue = async (): Promise<AbonneRow[]> => {
  const res = await apiClient.get<AbonneRow[]>('/service-abonnement/bienvenue')
  return Array.isArray(res.data) ? res.data : []
}

export const listRecrutement = async (): Promise<RecrutementRow[]> => {
  const res = await apiClient.get<RecrutementRow[]>('/service-abonnement/recrutement')
  return Array.isArray(res.data) ? res.data : []
}

export interface EnvoiSmsResultat {
  sent: number
  failed: number
  simulated: boolean
}

const normSmsRes = (d?: Partial<EnvoiSmsResultat>): EnvoiSmsResultat => ({
  sent: d?.sent ?? 0,
  failed: d?.failed ?? 0,
  simulated: d?.simulated ?? true,
})

export const envoyerSms = async (abonneIds: string[]): Promise<EnvoiSmsResultat> => {
  const res = await apiClient.post<EnvoiSmsResultat>('/service-abonnement/sms', { abonneIds })
  return normSmsRes(res.data)
}

// ---- Réglages régionaux (devise / langue) ----
export interface RegionConfig {
  pays: string
  devise: string
  symbole: string
  symboleAvant: boolean
  decimales: number
  langue: string
  locale: string
}

export const getRegion = async (): Promise<RegionConfig> => {
  const res = await apiClient.get<RegionConfig>('/region/config')
  return res.data
}

export const saveRegion = async (dto: Partial<RegionConfig>): Promise<RegionConfig> => {
  const res = await apiClient.put<RegionConfig>('/region/config', dto)
  return res.data
}

// ---- Configuration passerelle SMS (admin) ----
export interface ConfigSmsPublic {
  provider: string
  apiUrl: string
  sender: string
  actif: boolean
  envoiAuto: boolean
  apiKeyDefinie: boolean
  apiSecretDefini: boolean
}

export const getConfigSms = async (): Promise<ConfigSmsPublic> => {
  const res = await apiClient.get<ConfigSmsPublic>('/sms/config')
  return res.data
}

export const saveConfigSms = async (dto: Partial<{
  provider: string
  apiUrl: string
  apiKey: string
  apiSecret: string
  sender: string
  actif: boolean
  envoiAuto: boolean
}>): Promise<ConfigSmsPublic> => {
  const res = await apiClient.put<ConfigSmsPublic>('/sms/config', dto)
  return res.data
}

export const testerSms = async (numero: string): Promise<EnvoiSmsResultat> => {
  const res = await apiClient.post<EnvoiSmsResultat>('/sms/test', { numero })
  return normSmsRes(res.data)
}

// ---- Logistique : Décodeurs / Entrepôts / Mouvements de stock ----

export type DecodeurStatut =
  | 'EN_STOCK_ENTREPOT'
  | 'EN_STOCK_PDV'
  | 'VENDU'
  | 'IMMOBILISE'
  | 'DEFECTUEUX'

export interface LogistiqueStats {
  totalDecodeurs: number
  enEntrepot: number
  enPdv: number
  vendus: number
  immobilises: number
  defectueux: number
}

export interface DecodeurRow {
  id: string
  numSerie: string
  type: string
  statut: DecodeurStatut
  dateEntree: string
  entrepot: { code: string; nom: string } | null
  pdv: { code: string; raisonSociale: string } | null
}

export interface ImmobiliseRow extends DecodeurRow {
  joursImmobilise: number
}

export interface DecodeurAbonne {
  numAbonne: string
  nom: string
  prenom: string
  statut: string
}

export interface DecodeurDetail {
  numSerie: string
  type: string
  statut: DecodeurStatut
  dateEntree: string
  entrepot: { nom: string } | null
  pdv: { raisonSociale: string } | null
  abonnes: DecodeurAbonne[]
}

export interface RechercheDecodeurResult {
  found: boolean
  decodeur: DecodeurDetail | null
}

export interface InventaireRow {
  lieu: { code: string; nom: string }
  total: number
  z4: number
  globaz: number
  g11: number
}

export type MouvementType =
  | 'EN_ENTREPOT_PDV'
  | 'PDV_PDV'
  | 'ENTREPOT_ENTREPOT'
  | 'PDV_ENTREPOT'

export interface MouvementRow {
  id: string
  date: string
  type: MouvementType
  materiel: string
  quantite: number
  numBonLivraison: string
  sourceNom: string
  destinationNom: string
  statut: string
}

export interface CreateMouvementBody {
  type: MouvementType
  materiel: string
  sourceId: string
  destinationId: string
  quantite: number
  numBonLivraison: string
  date: string
}

export const logistiqueStats = async (): Promise<LogistiqueStats> => {
  const res = await apiClient.get<LogistiqueStats>('/logistique/stats')
  return res.data
}

export const listDecodeurs = async (params: {
  type?: string
  statut?: string
  scope?: 'entrepot' | 'pdv'
}): Promise<DecodeurRow[]> => {
  const search = new URLSearchParams()
  if (params.type) search.set('type', params.type)
  if (params.statut) search.set('statut', params.statut)
  if (params.scope) search.set('scope', params.scope)
  const qs = search.toString()
  const res = await apiClient.get<DecodeurRow[]>(`/decodeurs${qs ? `?${qs}` : ''}`)
  return Array.isArray(res.data) ? res.data : []
}

export const rechercheDecodeur = async (
  numSerie: string,
): Promise<RechercheDecodeurResult> => {
  const res = await apiClient.get<RechercheDecodeurResult>('/decodeurs/recherche', {
    params: { numSerie },
  })
  return res.data
}

export const listImmobilises = async (type?: string): Promise<ImmobiliseRow[]> => {
  const res = await apiClient.get<ImmobiliseRow[]>('/logistique/immobilises', {
    params: type ? { type } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}

export const inventaire = async (
  scope: 'entrepot' | 'pdv',
  type?: string,
): Promise<InventaireRow[]> => {
  const res = await apiClient.get<InventaireRow[]>('/logistique/inventaire', {
    params: { scope, ...(type ? { type } : {}) },
  })
  return Array.isArray(res.data) ? res.data : []
}

export const listMouvements = async (): Promise<MouvementRow[]> => {
  const res = await apiClient.get<MouvementRow[]>('/mouvements')
  return Array.isArray(res.data) ? res.data : []
}

export const createMouvement = async (
  body: CreateMouvementBody,
): Promise<MouvementRow> => {
  const res = await apiClient.post<MouvementRow>('/mouvements', body)
  return res.data
}

// ---- Analytique / Statistiques ----

export interface CaPdvRow {
  pdv: { code: string; raisonSociale: string }
  secteur: string
  nbOps: number
  caRecru: number
  caReabo: number
  caTotal: number
}

export interface ClassementPdvRow {
  rang: number
  pdv: { code: string; raisonSociale: string }
  secteur: string
  caTotal: number
  nbOps: number
}

export interface CaFormuleRow {
  formule: { code: string; nomCommercial: string }
  nb: number
  ca: number
  part: number
}

export interface RecrutementUserRow {
  user: { prenom: string; nom: string }
  nbRecru: number
  caRecru: number
  nbReabo: number
  total: number
}

export interface ArpuPdvRow {
  pdv: { raisonSociale: string }
  caTotal: number
  abonnesActifs: number
  arpu: number
}

export interface MaterielsVendusResult {
  parType: { type: string; nb: number }[]
  total: number
}

export interface AuditLogRow {
  id: string
  timestamp: string
  action: string
  module: string
  ip: string
  user: { prenom: string; nom: string; role: string }
}

export interface RapportGraphiqueData {
  periode: string
  bucket: 'day' | 'month'
  totaux: {
    caTotal: number
    caRecru: number
    caReabo: number
    caMigration: number
    caImpaye: number
    nbOps: number
    nbRecru: number
    nbReabo: number
  }
  deltas?: {
    caTotal: number | null
    caRecru: number | null
    caReabo: number | null
    nbOps: number | null
  }
  byDay: { date: string; recru: number; reabo: number; total: number }[]
  byFormule: { formule: string; montant: number; nb: number }[]
  byPdv: { pdv: string; montant: number; nb: number }[]
}

const EMPTY_RAPPORT: RapportGraphiqueData = {
  periode: '',
  bucket: 'day',
  totaux: { caTotal: 0, caRecru: 0, caReabo: 0, caMigration: 0, caImpaye: 0, nbOps: 0, nbRecru: 0, nbReabo: 0 },
  byDay: [],
  byFormule: [],
  byPdv: [],
}

export const rapportGraphique = async (
  opts?: { periode?: string; debut?: string; fin?: string },
): Promise<RapportGraphiqueData> => {
  const params: Record<string, string> = {}
  if (opts?.debut && opts?.fin) {
    params.debut = opts.debut
    params.fin = opts.fin
  } else if (opts?.periode) {
    params.periode = opts.periode
  }
  const res = await apiClient.get<RapportGraphiqueData>('/analytics/rapport-graphique', {
    params: Object.keys(params).length ? params : undefined,
  })
  return res.data && typeof res.data === 'object' ? { ...EMPTY_RAPPORT, ...res.data } : EMPTY_RAPPORT
}

export const caPdv = async (periode?: string): Promise<CaPdvRow[]> => {
  const res = await apiClient.get<CaPdvRow[]>('/analytics/ca-pdv', {
    params: periode ? { periode } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}

export const classementPdv = async (periode?: string): Promise<ClassementPdvRow[]> => {
  const res = await apiClient.get<ClassementPdvRow[]>('/analytics/classement-pdv', {
    params: periode ? { periode } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}

export const caFormule = async (periode?: string): Promise<CaFormuleRow[]> => {
  const res = await apiClient.get<CaFormuleRow[]>('/analytics/ca-formule', {
    params: periode ? { periode } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}

export const recrutementUser = async (periode?: string): Promise<RecrutementUserRow[]> => {
  const res = await apiClient.get<RecrutementUserRow[]>('/analytics/recrutement-user', {
    params: periode ? { periode } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}

export const arpuPdv = async (periode?: string): Promise<ArpuPdvRow[]> => {
  const res = await apiClient.get<ArpuPdvRow[]>('/analytics/arpu', {
    params: periode ? { periode } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}

export const materielsVendus = async (): Promise<MaterielsVendusResult> => {
  const res = await apiClient.get<MaterielsVendusResult>('/analytics/materiels-vendus')
  return res.data
}

export const auditLog = async (limit?: number): Promise<AuditLogRow[]> => {
  const res = await apiClient.get<AuditLogRow[]>('/audit-log', {
    params: limit !== undefined ? { limit } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}

// ---------- Dépenses ----------
export interface DepenseRow {
  id: string
  date: string
  categorie: string
  motif: string
  montant: number
  justificatif?: string | null
}
export interface DepensesStats {
  totalMois: number
  count: number
  parCategorie: { categorie: string; montant: number }[]
}
export interface CreateDepenseBody {
  date: string
  categorie: string
  motif: string
  montant: number
  justificatif?: string
}
export const listDepenses = async (periode?: string): Promise<DepenseRow[]> => {
  const res = await apiClient.get<DepenseRow[]>('/depenses', {
    params: periode ? { periode } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}
export const depensesStats = async (periode?: string): Promise<DepensesStats> => {
  const res = await apiClient.get<DepensesStats>('/depenses/stats', {
    params: periode ? { periode } : undefined,
  })
  return res.data
}
export const createDepense = async (body: CreateDepenseBody): Promise<DepenseRow> => {
  const res = await apiClient.post<DepenseRow>('/depenses', body)
  return res.data
}

// ---------- Objectifs ----------
export interface ObjectifRow {
  id: string
  pdvId: string | null
  typeObjectif: string
  cible: number
  periode: string
  pdv?: { raisonSociale: string } | null
}
export interface SuiviObjectifRow {
  id: string
  pdv: string
  typeObjectif: string
  periode: string
  cible: number
  realise: number
  taux: number
}
export interface CreateObjectifBody {
  pdvId?: string
  typeObjectif: string
  cible: number
  periode: string
}
export const listObjectifs = async (periode?: string): Promise<ObjectifRow[]> => {
  const res = await apiClient.get<ObjectifRow[]>('/objectifs', {
    params: periode ? { periode } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}
export const suiviObjectifs = async (periode?: string): Promise<SuiviObjectifRow[]> => {
  const res = await apiClient.get<SuiviObjectifRow[]>('/objectifs/suivi', {
    params: periode ? { periode } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}
export const createObjectif = async (body: CreateObjectifBody): Promise<ObjectifRow> => {
  const res = await apiClient.post<ObjectifRow>('/objectifs', body)
  return res.data
}

// ---------- Accessoires ----------
export interface AccessoireRow {
  id: string
  code: string
  nom: string
  prixUnitaire: number
  stockEntrepot: number
  stockReseauTotal: number
  venduTotal: number
  statut: string
}
export interface AccessoiresStats {
  nbAccessoires: number
  stockEntrepotTotal: number
  ventesMoisMontant: number
  retoursEnAttente: number
}
export interface StockReseauRow {
  id: string
  quantite: number
  accessoire: { nom: string; code: string }
  pdv: { raisonSociale: string }
}
export interface VenteAccessoireRow {
  id: string
  date: string
  quantite: number
  montant: number
  accessoire: { nom: string; code: string }
  pdv: { raisonSociale: string }
}
export interface RetourRow {
  id: string
  date: string
  quantite: number
  motif: string
  statut: string
  accessoire: { nom: string; code: string }
  pdv: { raisonSociale: string }
}
export const listAccessoires = async (): Promise<AccessoireRow[]> => {
  const res = await apiClient.get<AccessoireRow[]>('/accessoires')
  return Array.isArray(res.data) ? res.data : []
}
export const accessoiresStats = async (): Promise<AccessoiresStats> => {
  const res = await apiClient.get<AccessoiresStats>('/accessoires/stats')
  return res.data
}
export const createAccessoire = async (body: {
  code: string
  nom: string
  prixUnitaire: number
  stockEntrepot?: number
}): Promise<AccessoireRow> => {
  const res = await apiClient.post<AccessoireRow>('/accessoires', body)
  return res.data
}
export const approvisionnerAccessoire = async (body: {
  accessoireId: string
  quantite: number
}): Promise<AccessoireRow> => {
  const res = await apiClient.post<AccessoireRow>('/accessoires/approvisionnement', body)
  return res.data
}
export const listStockReseau = async (): Promise<StockReseauRow[]> => {
  const res = await apiClient.get<StockReseauRow[]>('/accessoires/stock-reseau')
  return Array.isArray(res.data) ? res.data : []
}
export const livrerAccessoire = async (body: {
  accessoireId: string
  pdvId: string
  quantite: number
}): Promise<StockReseauRow> => {
  const res = await apiClient.post<StockReseauRow>('/accessoires/livraison', body)
  return res.data
}
export const listVentesAccessoire = async (): Promise<VenteAccessoireRow[]> => {
  const res = await apiClient.get<VenteAccessoireRow[]>('/accessoires/ventes')
  return Array.isArray(res.data) ? res.data : []
}
export const vendreAccessoire = async (body: {
  accessoireId: string
  pdvId: string
  quantite: number
}): Promise<VenteAccessoireRow> => {
  const res = await apiClient.post<VenteAccessoireRow>('/accessoires/ventes', body)
  return res.data
}
export const listRetours = async (): Promise<RetourRow[]> => {
  const res = await apiClient.get<RetourRow[]>('/accessoires/retours')
  return Array.isArray(res.data) ? res.data : []
}
export const creerRetour = async (body: {
  accessoireId: string
  pdvId: string
  quantite: number
  motif: string
}): Promise<RetourRow> => {
  const res = await apiClient.post<RetourRow>('/accessoires/retours', body)
  return res.data
}

// ---------- Gestion des VAD ----------
export interface VadAgentRow {
  id: string
  code: string
  raisonSociale: string
  secteur: string
  stockDecodeurs: number
  kitsVendus: number
  caKits: number
}
export interface VadStats {
  nbAgents: number
  decodeursAttribues: number
  kitsVendusMois: number
  caKitsMois: number
}
export interface VadStockRow {
  id: string
  numSerie: string
  type: string
  statut: string
  pdv: { raisonSociale: string } | null
}
export interface VenteKitRow {
  id: string
  date: string
  decodeurType: string
  clientNom: string
  montant: number
  vadPdv: { raisonSociale: string }
}
export const vadAgents = async (): Promise<VadAgentRow[]> => {
  const res = await apiClient.get<VadAgentRow[]>('/vad/agents')
  return Array.isArray(res.data) ? res.data : []
}
export const vadStats = async (): Promise<VadStats> => {
  const res = await apiClient.get<VadStats>('/vad/stats')
  return res.data
}
export const vadStock = async (vadId?: string): Promise<VadStockRow[]> => {
  const res = await apiClient.get<VadStockRow[]>('/vad/stock', {
    params: vadId ? { vadId } : undefined,
  })
  return Array.isArray(res.data) ? res.data : []
}
export const vadVentes = async (): Promise<VenteKitRow[]> => {
  const res = await apiClient.get<VenteKitRow[]>('/vad/ventes')
  return Array.isArray(res.data) ? res.data : []
}
export const vadLivraison = async (body: {
  vadPdvId: string
  type: string
  quantite: number
}): Promise<{ livres: number }> => {
  const res = await apiClient.post<{ livres: number }>('/vad/livraison', body)
  return res.data
}
export const vadVenteKit = async (body: {
  vadPdvId: string
  decodeurType: string
  clientNom: string
  montant: number
}): Promise<VenteKitRow> => {
  const res = await apiClient.post<VenteKitRow>('/vad/vente-kit', body)
  return res.data
}

// ---------- Crédit ----------
export interface CreditRow {
  id: string
  pdvId: string
  plafond: number
  avoir: number
  dette: number
  encours: number
  creditDispo: number
  pdv: { code: string; raisonSociale: string }
}
export const listCredits = async (): Promise<CreditRow[]> => {
  const res = await apiClient.get<CreditRow[]>('/credits')
  return Array.isArray(res.data) ? res.data : []
}
export const rapportDette = async (): Promise<CreditRow[]> => {
  const res = await apiClient.get<CreditRow[]>('/rapport-dette')
  return Array.isArray(res.data) ? res.data : []
}

// ---------- Arrêtés de soldes ----------
export interface ArreteRow {
  id: string
  periode: string
  soldeFige: number
  dateArrete: string
  statut: string
  pdv: { code: string; raisonSociale: string }
}
export const listArretes = async (): Promise<ArreteRow[]> => {
  const res = await apiClient.get<ArreteRow[]>('/arretes')
  return Array.isArray(res.data) ? res.data : []
}
export const createArrete = async (body: { pdvId: string; periode: string }): Promise<ArreteRow> => {
  const res = await apiClient.post<ArreteRow>('/arretes', body)
  return res.data
}

// ---------- Suivi installation ----------
export interface InstallationRow {
  id: string
  clientNom: string
  technicien: string
  dateDemande: string
  dateInstallation: string | null
  statut: string
  pdv: { raisonSociale: string }
}
export interface InstallationStats {
  demandees: number
  installees: number
  total: number
  taux: number
}
export const listInstallations = async (): Promise<InstallationRow[]> => {
  const res = await apiClient.get<InstallationRow[]>('/installations')
  return Array.isArray(res.data) ? res.data : []
}
export const installationStats = async (): Promise<InstallationStats> => {
  const res = await apiClient.get<InstallationStats>('/installations/stats')
  return res.data
}
export const createInstallation = async (body: {
  pdvId: string
  clientNom: string
  technicien: string
}): Promise<InstallationRow> => {
  const res = await apiClient.post<InstallationRow>('/installations', body)
  return res.data
}
export const updateInstallation = async (
  id: string,
  body: { statut?: string; technicien?: string },
): Promise<InstallationRow> => {
  const res = await apiClient.patch<InstallationRow>(`/installations/${id}`, body)
  return res.data
}

// ---------- Augmentation caution ----------
export const augmenterCaution = async (pdvId: string, montant: number) => {
  const res = await apiClient.post(`/pdvs/${pdvId}/caution`, { montant })
  return res.data
}

// ---------- Réabo MOMO & BDD globale ----------
export interface ReaboMomoRow {
  id: string
  date: string
  numAbonne: string
  client: string
  formule: string
  pdv: string
  montant: number
  canal: string
}
export interface BddAbonneRow {
  id: string
  numAbonne: string
  client: string
  tel1: string
  formule: string
  pdv: string
  statut: string
  dateEcheance: string
}
export const reaboMomo = async (): Promise<ReaboMomoRow[]> => {
  const res = await apiClient.get<ReaboMomoRow[]>('/analytics/reabo-momo')
  return Array.isArray(res.data) ? res.data : []
}
export interface BddGlobaleParams {
  q?: string
  statut?: string
  formuleId?: string
  page?: number
  pageSize?: number
}
export interface BddGlobaleResult {
  rows: BddAbonneRow[]
  total: number
  page: number
  pageSize: number
}

export const bddGlobale = async (params: BddGlobaleParams = {}): Promise<BddGlobaleResult> => {
  const clean: Record<string, string | number> = {}
  if (params.q) clean.q = params.q
  if (params.statut) clean.statut = params.statut
  if (params.formuleId) clean.formuleId = params.formuleId
  if (params.page) clean.page = params.page
  if (params.pageSize) clean.pageSize = params.pageSize
  const res = await apiClient.get<BddGlobaleResult>('/analytics/bdd-globale', {
    params: Object.keys(clean).length ? clean : undefined,
  })
  const d = res.data
  return d && Array.isArray(d.rows)
    ? d
    : { rows: [], total: 0, page: 1, pageSize: params.pageSize ?? 50 }
}

// ---------- Notifications ----------
export interface NotificationRow {
  id: string
  type: 'WARN' | 'OK' | 'URGENT'
  message: string
  lien?: string | null
  lu: boolean
  dismissed: boolean
  createdAt: string
}
export const listNotifications = async (): Promise<{ items: NotificationRow[]; unread: number }> => {
  const res = await apiClient.get<{ items: NotificationRow[]; unread: number }>('/notifications')
  return res.data ?? { items: [], unread: 0 }
}
export const markNotificationsRead = async () => {
  await apiClient.patch('/notifications/read-all')
}
export const dismissNotification = async (id: string) => {
  await apiClient.patch(`/notifications/${id}/dismiss`)
}

// ---------- Recherche globale ----------
export interface SearchResults {
  abonnes: { id: string; numAbonne: string; nom: string; prenom: string }[]
  pdvs: { id: string; code: string; raisonSociale: string }[]
  decodeurs: { id: string; numSerie: string; type: string; statut: string }[]
}
export const searchGlobal = async (q: string): Promise<SearchResults> => {
  const res = await apiClient.get<SearchResults>('/search', { params: { q } })
  return res.data ?? { abonnes: [], pdvs: [], decodeurs: [] }
}

// ---------- Synthèse tableau de bord ----------
export interface SyntheseData {
  recouvrement: { creditRestant: number; avoir: number; encours: number; commMateriel: number; commFormule: number; commReabo: number }
  vente: { nbAbo: number; caRecru: number; nbMigration: number; rapport: string; objectif: number; ro: number; reste: number; atterrissage: number }
  reabo: { parcActif: number; nbReabo: number; caReabo: number; echus: number; objectif: number; ro: number; reste: number; atterrissage: number }
  logistique: { z4Stock: number; z4Reseau: number; z4Defectueux: number; globazStock: number; globazReseau: number; g11Stock: number; g11Reseau: number }
}
export const getSynthese = async (): Promise<SyntheseData> => {
  const res = await apiClient.get<SyntheseData>('/dashboard/synthese')
  return res.data
}

// ---------- Retour client RPE ----------
export interface RetourRpeRow {
  id: string
  numAbonne: string
  nom: string
  prenom: string
  tel?: string
  formule?: string
  pdv?: string
  agent?: string
  joint: string
  installation: string
  satisfaction: string
  mycanal: string
  netflix: string
  progrFidel: string
  score?: number
  commentaire?: string
  statut: string
  date: string
}
export const listRetourRpe = async (): Promise<RetourRpeRow[]> => {
  const res = await apiClient.get<RetourRpeRow[]>('/retour-rpe')
  return Array.isArray(res.data) ? res.data : []
}
export const createRetourRpe = async (body: Partial<RetourRpeRow>): Promise<RetourRpeRow> => {
  const res = await apiClient.post<RetourRpeRow>('/retour-rpe', body)
  return res.data
}
export const updateRetourRpe = async (id: string, body: Partial<RetourRpeRow>): Promise<RetourRpeRow> => {
  const res = await apiClient.patch<RetourRpeRow>(`/retour-rpe/${id}`, body)
  return res.data
}

// ---------- Suivi M+ (cohorte réabonnement) ----------
export interface SuiviMpReport {
  periode: string
  type: string
  rows: { date: string; echeance: string; nbreRecrut: number; realise: number; taux: number; reseau: number; mobileMoney: number; reste: number }[]
  totaux: { nbreRecrut: number; realise: number; reseau: number; mobileMoney: number; reste: number; taux: number }
}
export const suiviMpReport = async (params: { mois?: number; annee?: number; type?: string; pdvId?: string }): Promise<SuiviMpReport> => {
  const res = await apiClient.get<SuiviMpReport>('/service-abonnement/suivi-mp', { params })
  return res.data
}
