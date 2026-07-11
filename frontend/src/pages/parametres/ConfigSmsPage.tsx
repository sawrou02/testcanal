import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { getConfigSms, saveConfigSms, testerSms, type ConfigSmsPublic } from '../../lib/api'

const PROVIDERS = [
  { value: 'ORANGE', label: 'Orange SMS Pro' },
  { value: 'AFRICASTALKING', label: "Africa's Talking" },
  { value: 'TWILIO', label: 'Twilio' },
  { value: 'CUSTOM', label: 'Autre passerelle (HTTP)' },
]

/** Aide contextuelle par fournisseur : à quoi correspondent Clé / Secret / URL. */
const HINTS: Record<string, { key: string; secret: string; url: string; note: string }> = {
  ORANGE: {
    key: 'Jeton d’accès (token) fourni par Orange',
    secret: '(non utilisé)',
    url: 'URL du point d’envoi SMS Orange',
    note: 'Orange SMS Pro : livraison locale la plus fiable. Le nom d’expéditeur doit être validé par Orange.',
  },
  AFRICASTALKING: {
    key: 'API Key',
    secret: 'Username',
    url: '(laisser vide = point d’accès par défaut)',
    note: "Africa's Talking : bonne couverture Afrique, inscription rapide.",
  },
  TWILIO: {
    key: 'Account SID',
    secret: 'Auth Token',
    url: '(automatique)',
    note: 'Twilio : très fiable, facturation en USD, coût plus élevé vers l’Afrique.',
  },
  CUSTOM: {
    key: 'Jeton Bearer',
    secret: '(optionnel)',
    url: 'URL de l’API (POST JSON { to, from, message })',
    note: 'Toute passerelle acceptant un POST JSON avec un jeton Bearer.',
  },
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
      {hint && <span className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
      {children}
    </label>
  )
}

const inputCls = 'mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
const inputStyle = { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' } as const

export default function ConfigSmsPage() {
  const toast = useToast()
  const [cfg, setCfg] = useState<ConfigSmsPublic | null>(null)
  const [provider, setProvider] = useState('ORANGE')
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [sender, setSender] = useState('SENDISTRI')
  const [actif, setActif] = useState(false)
  const [envoiAuto, setEnvoiAuto] = useState(false)
  const [numTest, setNumTest] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const load = useCallback(async () => {
    try {
      const c = await getConfigSms()
      setCfg(c)
      setProvider(c.provider || 'ORANGE')
      setApiUrl(c.apiUrl)
      setSender(c.sender)
      setActif(c.actif)
      setEnvoiAuto(c.envoiAuto)
    } catch {
      toast.error('Erreur lors du chargement de la configuration')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { void load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      const dto: Record<string, unknown> = { provider, apiUrl, sender, actif, envoiAuto }
      if (apiKey.trim()) dto.apiKey = apiKey.trim()
      if (apiSecret.trim()) dto.apiSecret = apiSecret.trim()
      const c = await saveConfigSms(dto)
      setCfg(c)
      setApiKey('')
      setApiSecret('')
      toast.success('Configuration enregistrée')
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    if (!numTest.trim()) { toast.warning('Entrez un numéro de test'); return }
    setTesting(true)
    try {
      const res = await testerSms(numTest.trim())
      if (res.simulated) {
        toast.info('Passerelle non activée : rien n’a été envoyé (activez « Envois réels » et enregistrez d’abord).')
      } else if (res.sent > 0) {
        toast.success('SMS de test envoyé ✓')
      } else {
        toast.error('Échec de l’envoi du SMS de test — vérifiez la clé et le numéro.')
      }
    } catch {
      toast.error('Échec de l’envoi du SMS de test')
    } finally {
      setTesting(false)
    }
  }

  const hint = HINTS[provider] ?? HINTS.CUSTOM

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>Passerelle SMS</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Branchez un fournisseur pour envoyer les relances par SMS — manuellement ou automatiquement chaque matin.
        </p>
      </div>

      {/* État */}
      <div
        className="rounded-xl border p-4 flex items-center gap-3"
        style={{
          background: cfg?.actif ? 'rgba(14,138,79,0.08)' : 'var(--surface)',
          borderColor: cfg?.actif ? '#0E8A4F' : 'var(--border)',
        }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg?.actif ? '#0E8A4F' : '#9AA3AE' }} />
        <div className="text-sm" style={{ color: 'var(--text)' }}>
          {cfg?.actif ? (
            <>Passerelle <b>activée</b> — les envois partent réellement{cfg.envoiAuto ? ', dont l’envoi automatique chaque matin.' : '.'}</>
          ) : (
            <>Passerelle <b>désactivée</b> — mode semi-automatique (le système prépare la liste, l’envoi reste en 1 clic).</>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Field label="Fournisseur">
          <select className={inputCls} style={inputStyle} value={provider} onChange={(e) => setProvider(e.target.value)}>
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <p className="text-xs -mt-2" style={{ color: 'var(--text-muted)' }}>{hint.note}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Clé / Identifiant" hint={hint.key}>
            <input
              className={inputCls} style={inputStyle} type="password" autoComplete="off"
              value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder={cfg?.apiKeyDefinie ? '•••••• (déjà enregistrée)' : ''}
            />
          </Field>
          <Field label="Secret / Mot de passe" hint={hint.secret}>
            <input
              className={inputCls} style={inputStyle} type="password" autoComplete="off"
              value={apiSecret} onChange={(e) => setApiSecret(e.target.value)}
              placeholder={cfg?.apiSecretDefini ? '•••••• (déjà enregistré)' : ''}
            />
          </Field>
        </div>

        <Field label="URL de l’API" hint={hint.url}>
          <input className={inputCls} style={inputStyle} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://…" />
        </Field>

        <Field label="Nom d’expéditeur" hint="Affiché comme expéditeur du SMS (max 11 caractères, à valider chez l’opérateur).">
          <input className={inputCls} style={inputStyle} value={sender} onChange={(e) => setSender(e.target.value)} maxLength={11} />
        </Field>

        <div className="flex flex-col gap-2 pt-1">
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
            <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
            Activer les envois réels
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
            <input type="checkbox" checked={envoiAuto} onChange={(e) => setEnvoiAuto(e.target.checked)} />
            Envoi automatique des relances chaque matin (07h00)
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={save} loading={saving}>Enregistrer</Button>
        </div>
      </div>

      {/* Test */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text)' }}>Tester l’envoi</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Enregistrez d’abord la configuration, puis envoyez un SMS d’essai à votre propre numéro.
        </p>
        <div className="flex items-end gap-2 flex-wrap">
          <input
            className={inputCls + ' w-56'} style={inputStyle}
            value={numTest} onChange={(e) => setNumTest(e.target.value)}
            placeholder="77 123 45 67"
          />
          <Button variant="secondary" onClick={test} loading={testing}>Envoyer un test</Button>
        </div>
      </div>
    </div>
  )
}
