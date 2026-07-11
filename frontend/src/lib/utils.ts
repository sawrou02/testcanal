export interface CurrencyConfig {
  symbole: string
  symboleAvant: boolean
  decimales: number
  locale: string
}

const currency: CurrencyConfig = {
  symbole: 'F',
  symboleAvant: false,
  decimales: 0,
  locale: 'fr-FR',
}

/** Applique une nouvelle devise/locale (réglages régionaux, appelé au démarrage). */
export const setCurrency = (cfg: Partial<CurrencyConfig>): void => {
  if (cfg.symbole !== undefined) currency.symbole = cfg.symbole
  if (cfg.symboleAvant !== undefined) currency.symboleAvant = cfg.symboleAvant
  if (cfg.decimales !== undefined) currency.decimales = cfg.decimales
  if (cfg.locale !== undefined) currency.locale = cfg.locale
}

export const getCurrency = (): CurrencyConfig => ({ ...currency })

/**
 * Formate un montant selon la devise configurée. Nommée formatFCFA pour
 * raisons historiques (utilisée partout), mais suit désormais la devise
 * choisie dans Paramètres régionaux — plus limitée au FCFA.
 */
export const formatFCFA = (n: number): string => {
  const value = currency.decimales > 0 ? n : Math.round(n)
  const num = value.toLocaleString(currency.locale, {
    minimumFractionDigits: currency.decimales,
    maximumFractionDigits: currency.decimales,
  })
  return currency.symboleAvant ? `${currency.symbole}${num}` : `${num} ${currency.symbole}`
}

/** Alias explicite, à préférer dans le nouveau code. */
export const formatMoney = formatFCFA

export const cn = (...classes: (string | undefined | false | null)[]): string =>
  classes.filter(Boolean).join(' ')

export const formatDate = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString(currency.locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Administrateur',
    MANAGER: 'Manager',
    COMPTABLE: 'Comptable',
    LOGISTICIEN: 'Logisticien',
    COMMERCIAL: 'Commercial',
    VENDEUR: 'Vendeur',
  }
  return labels[role] || role
}
