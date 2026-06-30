export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'COMPTABLE'
  | 'LOGISTICIEN'
  | 'COMMERCIAL'
  | 'VENDEUR'

export interface User {
  id: string
  nom: string
  prenom: string
  email: string
  role: Role
  pdvId?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export interface KpiCardData {
  label: string
  value: string
  delta: number
  deltaLabel: string
  color?: 'green' | 'gold' | 'red' | 'blue'
}

export interface NavItem {
  id: string
  label: string
  path?: string
  badge?: number
  /** Restriction fine par rôle (optionnelle). Si absent, hérite de la section. */
  roles?: Role[]
}

export interface NavSection {
  id: string
  label: string
  icon: string
  badge?: number
  items: NavItem[]
  defaultOpen?: boolean
  singleLink?: boolean
}

export interface AlertItem {
  id: string
  type: 'warn' | 'ok' | 'urgent'
  message: string
  lien?: string
}

export type Theme = 'light' | 'dark'

export interface LoginResponse {
  access_token: string
  user: User
}
