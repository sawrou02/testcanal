import { exportExcel } from '../../lib/export'
import { formatDate } from '../../lib/utils'
import type { AbonneRow } from '../../lib/api'

/**
 * Normalise un numéro sénégalais au format international pour WhatsApp.
 * Ex. "77 123 45 67" -> "221771234567".
 */
export function waNumber(tel?: string): string {
  let d = (tel || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('00221')) return d.slice(2)
  if (d.startsWith('221')) return d
  d = d.replace(/^0+/, '')
  if (d.length === 9) return '221' + d // numéro local (7X XXX XX XX)
  return d
}

/** Message de relance par défaut (personnalisé avec le nom de l'abonné). */
export function relanceMessage(a: AbonneRow): string {
  const nom = `${a.prenom || ''} ${a.nom || ''}`.trim()
  const ech = a.dateEcheance ? ` (échéance le ${formatDate(a.dateEcheance)})` : ''
  return `Bonjour ${nom}, votre abonnement arrive à échéance${ech}. Pensez à le renouveler pour éviter toute coupure. Merci.`
}

/** Message de bienvenue pour un nouvel abonné. */
export function welcomeMessage(a: AbonneRow): string {
  const nom = `${a.prenom || ''} ${a.nom || ''}`.trim()
  return `Bonjour ${nom}, bienvenue chez nous ! Votre abonnement est bien activé. Notre équipe reste à votre disposition. Merci de votre confiance.`
}

/** Bouton WhatsApp : ouvre directement la discussion avec le numéro, message pré-rempli. */
export function WhatsAppButton({ abonne, kind = 'relance' }: { abonne: AbonneRow; kind?: 'relance' | 'bienvenue' }) {
  const num = waNumber(abonne.tel1)
  if (!num) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const msg = kind === 'bienvenue' ? welcomeMessage(abonne) : relanceMessage(abonne)
  const href = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Relancer sur WhatsApp"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:opacity-90"
      style={{ background: '#25D366', color: '#fff' }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.617zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
      </svg>
    </a>
  )
}

/** Exporte les numéros (Excel) pour une campagne WhatsApp / SMS groupé. */
export function exportNumbers(rows: AbonneRow[], title: string) {
  void exportExcel({
    title,
    columns: [
      { key: 'numAbonne', label: 'N° Abonné' },
      { key: 'client', label: 'Nom & Prénom' },
      { key: 'tel1', label: 'Téléphone' },
      { key: 'tel2', label: 'Téléphone 2' },
      { key: 'formule', label: 'Formule' },
      { key: 'echeance', label: 'Échéance' },
    ],
    rows: rows.map((r) => ({
      numAbonne: r.numAbonne,
      client: `${r.prenom || ''} ${r.nom || ''}`.trim(),
      tel1: r.tel1 || '',
      tel2: (r as unknown as { tel2?: string }).tel2 || '',
      formule: r.formule?.nomCommercial || '',
      echeance: r.dateEcheance ? formatDate(r.dateEcheance) : '',
    })),
  })
}
