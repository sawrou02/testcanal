import { useState } from 'react'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { envoyerSms, type AbonneRow } from '../../lib/api'
import { SMS_ROLES } from './shared'

/**
 * Encapsulates the "Envoyer SMS à tous" behaviour shared by the AAE and
 * Échus pages: role gating, sending state and the success/error toast.
 */
export function useSmsRelance() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canSendSms = role ? SMS_ROLES.includes(role) : false
  const [sending, setSending] = useState(false)

  const sendSms = async (rows: AbonneRow[]) => {
    if (rows.length === 0) return
    setSending(true)
    try {
      const res = await envoyerSms(rows.map((r) => r.id))
      if (res.simulated) {
        toast.info(`${res.sent} abonné(s) prêts — activez la passerelle SMS (Paramètres) pour un envoi réel.`)
      } else {
        toast.success(`SMS envoyés : ${res.sent}${res.failed ? ` (${res.failed} échec)` : ''}`)
      }
    } catch {
      toast.error("Erreur lors de l'envoi des SMS")
    } finally {
      setSending(false)
    }
  }

  return { canSendSms, sending, sendSms }
}
