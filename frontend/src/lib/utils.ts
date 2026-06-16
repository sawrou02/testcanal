export const formatFCFA = (n: number): string =>
  Math.round(n).toLocaleString('fr-FR').replace(/ /g, ' ') + ' F'

export const cn = (...classes: (string | undefined | false | null)[]): string =>
  classes.filter(Boolean).join(' ')

export const formatDate = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('fr-FR', {
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
