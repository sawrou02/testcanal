import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { demoStatus, demoLoad, demoClear, type DemoStatus } from '../../lib/api'
import { t } from '../../lib/locale'

export default function DemoPage() {
  const toast = useToast()
  const [status, setStatus] = useState<DemoStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setStatus(await demoStatus())
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  const load = async () => {
    setLoading(true)
    setErreur(null)
    try {
      const r = await demoLoad()
      if (r.ok) {
        toast.success(t('Données de démonstration chargées ✓'))
        window.setTimeout(() => window.location.reload(), 800)
      } else {
        setErreur(r.message || t('Erreur lors du chargement'))
        toast.error(r.message || t('Erreur lors du chargement'))
      }
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string; statusCode?: number } }; message?: string })
      const detail = res?.response?.data?.message
        ? `${res.response.data.statusCode ?? ''} ${res.response.data.message}`.trim()
        : res?.message || 'Erreur réseau'
      setErreur(detail)
      toast.error(t('Erreur lors du chargement'))
    } finally {
      setLoading(false)
      void refresh()
    }
  }

  const clear = async () => {
    setClearing(true)
    try {
      await demoClear()
      toast.success(t('Données de démonstration retirées ✓'))
      window.setTimeout(() => window.location.reload(), 800)
    } catch {
      toast.error(t('Erreur lors du retrait'))
    } finally {
      setClearing(false)
      void refresh()
    }
  }

  const present = status?.present

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>{t('Données de démonstration')}</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {t('Remplissez le logiciel de données fictives pour le présenter, puis retirez-les en un clic.')}
        </p>
      </div>

      {/* État */}
      <div
        className="rounded-xl border p-4 flex items-center gap-3"
        style={{
          background: present ? 'rgba(226,160,0,0.08)' : 'var(--surface)',
          borderColor: present ? '#E2A000' : 'var(--border)',
        }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: present ? '#E2A000' : '#9AA3AE' }} />
        <div className="text-sm" style={{ color: 'var(--text)' }}>
          {present ? (
            <>{t('Données de démonstration présentes')} : <b>{status?.abonnes}</b> {t('abonnés')}, <b>{status?.encaissements}</b> {t('encaissements')}.</>
          ) : (
            t('Aucune donnée de démonstration actuellement.')
          )}
        </div>
      </div>

      {erreur && (
        <div className="rounded-xl border p-4 text-sm" style={{ background: 'rgba(210,58,44,0.08)', borderColor: '#D23A2C', color: 'var(--text)' }}>
          <p className="font-bold mb-1" style={{ color: '#D23A2C' }}>{t('Détail de l’erreur (à me transmettre)')} :</p>
          <p className="font-mono text-xs break-words">{erreur}</p>
        </div>
      )}

      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div>
          <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text)' }}>{t('Charger la démonstration')}</h3>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {t('Ajoute ~240 abonnés et ~700 encaissements répartis sur 6 mois (tableau de bord, rapport graphique, relances). Vos vraies données ne sont pas modifiées.')}
          </p>
          <Button onClick={load} loading={loading} disabled={clearing}>{t('Charger les données de démonstration')}</Button>
        </div>

        <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text)' }}>{t('Retirer la démonstration')}</h3>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {t('Supprime uniquement les données de démonstration (jamais vos vraies données). À faire après la présentation.')}
          </p>
          <Button variant="secondary" onClick={clear} loading={clearing} disabled={loading || !present}>
            {t('Retirer les données de démonstration')}
          </Button>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {t('Astuce : ces boutons fonctionnent même logiciel ouvert — aucun fichier à manipuler.')}
      </p>
    </div>
  )
}
