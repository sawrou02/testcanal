import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { getRegion, saveRegion, type RegionConfig } from '../../lib/api'
import { applyRegion, useLocale } from '../../lib/locale'

/** Préréglages par pays/devise (Afrique + international courant). */
const PRESETS: (RegionConfig & { nom: string })[] = [
  { nom: 'Sénégal — FCFA (XOF)', pays: 'SN', devise: 'XOF', symbole: 'F', symboleAvant: false, decimales: 0, langue: 'fr', locale: 'fr-FR' },
  { nom: "Côte d'Ivoire — FCFA (XOF)", pays: 'CI', devise: 'XOF', symbole: 'F', symboleAvant: false, decimales: 0, langue: 'fr', locale: 'fr-FR' },
  { nom: 'Mali — FCFA (XOF)', pays: 'ML', devise: 'XOF', symbole: 'F', symboleAvant: false, decimales: 0, langue: 'fr', locale: 'fr-FR' },
  { nom: 'Cameroun — FCFA (XAF)', pays: 'CM', devise: 'XAF', symbole: 'FCFA', symboleAvant: false, decimales: 0, langue: 'fr', locale: 'fr-FR' },
  { nom: 'Gabon — FCFA (XAF)', pays: 'GA', devise: 'XAF', symbole: 'FCFA', symboleAvant: false, decimales: 0, langue: 'fr', locale: 'fr-FR' },
  { nom: 'Nigeria — Naira (₦)', pays: 'NG', devise: 'NGN', symbole: '₦', symboleAvant: true, decimales: 0, langue: 'en', locale: 'en-NG' },
  { nom: 'Ghana — Cedi (GH₵)', pays: 'GH', devise: 'GHS', symbole: 'GH₵', symboleAvant: true, decimales: 2, langue: 'en', locale: 'en-GH' },
  { nom: 'Kenya — Shilling (KSh)', pays: 'KE', devise: 'KES', symbole: 'KSh', symboleAvant: true, decimales: 0, langue: 'en', locale: 'en-KE' },
  { nom: 'Afrique du Sud — Rand (R)', pays: 'ZA', devise: 'ZAR', symbole: 'R', symboleAvant: true, decimales: 2, langue: 'en', locale: 'en-ZA' },
  { nom: 'International — Dollar ($)', pays: 'US', devise: 'USD', symbole: '$', symboleAvant: true, decimales: 2, langue: 'en', locale: 'en-US' },
  { nom: 'International — Euro (€)', pays: 'EU', devise: 'EUR', symbole: '€', symboleAvant: false, decimales: 2, langue: 'fr', locale: 'fr-FR' },
]

const inputCls = 'mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
const inputStyle = { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' } as const

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
      {children}
    </label>
  )
}

export default function RegionPage() {
  const toast = useToast()
  const { t } = useLocale()
  const [cfg, setCfg] = useState<RegionConfig>({
    pays: 'SN', devise: 'XOF', symbole: 'F', symboleAvant: false, decimales: 0, langue: 'fr', locale: 'fr-FR',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setCfg(await getRegion())
    } catch {
      toast.error('Erreur lors du chargement')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { void load() }, [load])

  // Aperçu live d'un montant, calculé localement (sans toucher à la devise globale).
  const apercu = (() => {
    const n = cfg.decimales > 0 ? 1250000 : Math.round(1250000)
    const num = n.toLocaleString(cfg.locale || 'fr-FR', {
      minimumFractionDigits: cfg.decimales,
      maximumFractionDigits: cfg.decimales,
    })
    return cfg.symboleAvant ? `${cfg.symbole}${num}` : `${num} ${cfg.symbole}`
  })()

  const applyPreset = (nom: string) => {
    const p = PRESETS.find((x) => x.nom === nom)
    if (p) setCfg({ pays: p.pays, devise: p.devise, symbole: p.symbole, symboleAvant: p.symboleAvant, decimales: p.decimales, langue: p.langue, locale: p.locale })
  }

  const save = async () => {
    setSaving(true)
    try {
      const saved = await saveRegion(cfg)
      applyRegion(saved) // applique immédiatement devise + langue
      toast.success('Réglages enregistrés')
      // Recharge pour propager la devise à tous les écrans déjà rendus.
      setTimeout(() => window.location.reload(), 600)
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>{t('Réglages régionaux')}</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Devise et langue du logiciel — adaptez-le à votre pays. Un déploiement = un pays / une devise.
        </p>
      </div>

      {/* Aperçu */}
      <div className="rounded-xl border p-4 flex items-center gap-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Aperçu d'un montant :</span>
        <span className="text-2xl font-black" style={{ color: 'var(--text)', fontFamily: 'IBM Plex Mono, monospace' }}>{apercu}</span>
      </div>

      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Field label="Pays / devise (préréglage)">
          <select className={inputCls} style={inputStyle} value={PRESETS.find((p) => p.devise === cfg.devise && p.symbole === cfg.symbole)?.nom ?? ''} onChange={(e) => applyPreset(e.target.value)}>
            <option value="">— Choisir un préréglage —</option>
            {PRESETS.map((p) => <option key={p.nom} value={p.nom}>{p.nom}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Code devise">
            <input className={inputCls} style={inputStyle} value={cfg.devise} onChange={(e) => setCfg({ ...cfg, devise: e.target.value.toUpperCase() })} maxLength={4} />
          </Field>
          <Field label="Symbole">
            <input className={inputCls} style={inputStyle} value={cfg.symbole} onChange={(e) => setCfg({ ...cfg, symbole: e.target.value })} maxLength={6} />
          </Field>
          <Field label="Décimales">
            <select className={inputCls} style={inputStyle} value={cfg.decimales} onChange={(e) => setCfg({ ...cfg, decimales: Number(e.target.value) })}>
              <option value={0}>0</option>
              <option value={2}>2</option>
            </select>
          </Field>
          <Field label="Symbole avant ?">
            <select className={inputCls} style={inputStyle} value={cfg.symboleAvant ? '1' : '0'} onChange={(e) => setCfg({ ...cfg, symboleAvant: e.target.value === '1' })}>
              <option value="0">Après (100 F)</option>
              <option value="1">Avant ($100)</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Langue">
            <select className={inputCls} style={inputStyle} value={cfg.langue} onChange={(e) => setCfg({ ...cfg, langue: e.target.value })}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Format des nombres (locale)">
            <input className={inputCls} style={inputStyle} value={cfg.locale} onChange={(e) => setCfg({ ...cfg, locale: e.target.value })} placeholder="fr-FR / en-NG…" />
          </Field>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          La traduction anglaise couvre le menu et l'ossature ; les écrans restants passent à l'anglais au fil des mises à jour.
        </p>

        <div className="pt-1">
          <Button onClick={save} loading={saving}>{t('Enregistrer')}</Button>
        </div>
      </div>
    </div>
  )
}
