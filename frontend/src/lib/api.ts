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

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const res = await apiClient.post<LoginResponse>('/auth/login', { email, password })
  return res.data
}

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
}

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
}

export const searchAbonnes = async (q: string): Promise<Abonne[]> => {
  const res = await apiClient.get<Abonne[]>('/abonnes', { params: { q } })
  return Array.isArray(res.data) ? res.data : []
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
