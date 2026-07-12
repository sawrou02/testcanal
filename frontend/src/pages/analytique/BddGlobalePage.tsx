import { useCallback, useEffect, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { RowDeleteButton } from '../../components/ui/RowDeleteButton'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { useResource } from '../../hooks/useResource'
import { formatDate } from '../../lib/utils'
import { t } from '../../lib/locale'
import { exportExcel } from '../../lib/export'
import {
  bddGlobale,
  createAbonne,
  updateAbonne,
  type BddAbonneRow,
  type BddGlobaleResult,
  type AbonneInput,
} from '../../lib/api'
import { Card, PageHeader, FieldLabel, inputCls } from '../../components/ui/Section'

const STATUT_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  ACTIF: 'success',
  ECHU: 'danger',
  SUSPENDU: 'warning',
  RESILIE: 'neutral',
}

const MUT = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VENDEUR']
const STATUTS = ['ACTIF', 'ECHU', 'SUSPENDU', 'RESILIE']
const PAGE_SIZE = 50
const EXPORT_CAP = 5000

interface FormuleLite { id: string; code: string; nomCommercial: string }
interface PdvLite { id: string; raisonSociale: string }

const emptyForm: AbonneInput = {
  numAbonne: '', nom: '', prenom: '', tel1: '', tel2: '',
  formuleId: '', pdvId: '', dateEcheance: '', statut: 'ACTIF',
}

export default function BddGlobalePage() {
  const toast = useToast()
  const role = useAuthStore((s) => s.user?.role)
  const canMutate = role ? MUT.includes(role) : false

  const { data: formules } = useResource<FormuleLite>('/formules')
  const { data: pdvs } = useResource<PdvLite>('/pdvs')

  // ----- Recherche serveur -----
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [statut, setStatut] = useState('')
  const [formuleId, setFormuleId] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<BddGlobaleResult>({ rows: [], total: 0, page: 1, pageSize: PAGE_SIZE })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Debounce de la saisie (350 ms) pour ne pas requêter à chaque touche.
  useEffect(() => {
    const timer = setTimeout(() => setQDebounced(q.trim()), 350)
    return () => clearTimeout(timer)
  }, [q])

  // Tout changement de filtre revient à la page 1.
  useEffect(() => { setPage(1) }, [qDebounced, statut, formuleId])

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      setData(await bddGlobale({ q: qDebounced, statut, formuleId, page, pageSize: PAGE_SIZE }))
    } catch {
      toast.error(t('Erreur lors du chargement'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, statut, formuleId, page])

  useEffect(() => { void refetch() }, [refetch])

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const from = data.total === 0 ? 0 : (data.page - 1) * PAGE_SIZE + 1
  const to = Math.min(data.page * PAGE_SIZE, data.total)

  const exportResults = async () => {
    setExporting(true)
    try {
      const all = await bddGlobale({ q: qDebounced, statut, formuleId, page: 1, pageSize: EXPORT_CAP })
      if (all.total > EXPORT_CAP) {
        toast.warning(`Export limité aux ${EXPORT_CAP.toLocaleString('fr-FR')} premiers résultats sur ${all.total.toLocaleString('fr-FR')}.`)
      }
      await exportExcel({
        title: 'Base de données globale',
        columns: [
          { key: 'numAbonne', label: 'N° Abonné' },
          { key: 'client', label: 'Nom & Prénom' },
          { key: 'tel1', label: 'Téléphone' },
          { key: 'formule', label: 'Formule' },
          { key: 'pdv', label: 'PDV' },
          { key: 'dateEcheance', label: 'Échéance' },
          { key: 'statut', label: 'Statut' },
        ],
        rows: all.rows.map((r) => ({ ...r, dateEcheance: r.dateEcheance ? formatDate(r.dateEcheance) : '' })),
      })
    } catch {
      toast.error(t("Erreur lors de l'export"))
    } finally {
      setExporting(false)
    }
  }

  // ----- Create / Edit -----
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<AbonneInput>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const set = (k: keyof AbonneInput, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const openCreate = () => {
    setEditId(null)
    setForm({ ...emptyForm, formuleId: formules[0]?.id ?? '', pdvId: pdvs[0]?.id ?? '' })
    setOpen(true)
  }

  const openEdit = (row: BddAbonneRow) => {
    if (!canMutate) return
    setEditId(row.id)
    const f = formules.find((x) => `${x.code}` === row.formule || x.nomCommercial === row.formule)
    const p = pdvs.find((x) => x.raisonSociale === row.pdv)
    const [prenom, ...rest] = (row.client || '').split(' ')
    setForm({
      numAbonne: row.numAbonne,
      nom: rest.join(' ') || row.client,
      prenom: prenom || '',
      tel1: row.tel1,
      tel2: '',
      formuleId: f?.id ?? formules[0]?.id ?? '',
      pdvId: p?.id ?? pdvs[0]?.id ?? '',
      dateEcheance: row.dateEcheance ? row.dateEcheance.slice(0, 10) : '',
      statut: row.statut,
    })
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nom.trim() || !form.prenom.trim()) { toast.error(t('Nom et prénom requis')); return }
    if (!form.tel1.trim()) { toast.error(t('Téléphone requis')); return }
    if (!form.formuleId) { toast.error(t('Choisissez une formule')); return }
    if (!form.pdvId) { toast.error(t('Choisissez un PDV')); return }
    setSubmitting(true)
    try {
      if (editId) {
        await updateAbonne(editId, form)
        toast.success(t('Abonné modifié ✓'))
      } else {
        await createAbonne(form)
        toast.success(t('Abonné créé ✓'))
      }
      setOpen(false)
      void refetch()
    } catch {
      toast.error(t("Erreur lors de l'enregistrement"))
    } finally {
      setSubmitting(false)
    }
  }

  const selectCls = 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
  const selectStyle = { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' } as const

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title={t('Base de données globale')} subtitle={t('Tous les abonnés du réseau — recherche instantanée')} />
        {canMutate && <Button variant="primary" onClick={openCreate}>+ {t('Nouvel abonné')}</Button>}
      </div>

      <Card>
        {/* Barre de recherche + filtres (côté serveur) */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Rechercher : nom, téléphone, N° abonné, PDV…')}
            className={selectCls + ' flex-1 min-w-[240px]'}
            style={selectStyle}
          />
          <select value={statut} onChange={(e) => setStatut(e.target.value)} className={selectCls} style={selectStyle}>
            <option value="">{t('Tous statuts')}</option>
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={formuleId} onChange={(e) => setFormuleId(e.target.value)} className={selectCls} style={selectStyle}>
            <option value="">{t('Toutes formules')}</option>
            {formules.map((f) => <option key={f.id} value={f.id}>{f.nomCommercial}</option>)}
          </select>
          <Button variant="secondary" onClick={exportResults} loading={exporting} disabled={data.total === 0}>
            {t('Exporter')}
          </Button>
        </div>

        {/* Compteur */}
        <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
          {loading ? t('Chargement…') : (
            data.total === 0 ? t('Aucun abonné trouvé')
              : `${data.total.toLocaleString('fr-FR')} ${t('abonné(s) — affichage')} ${from.toLocaleString('fr-FR')}–${to.toLocaleString('fr-FR')}`
          )}
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto min-h-[420px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="py-2 pr-3 font-semibold">{t('N° Abonné')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Nom & Prénom')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Téléphone')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Formule')}</th>
                <th className="py-2 pr-3 font-semibold">{t('PDV')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Échéance')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Statut')}</th>
                {canMutate && <th className="py-2 font-semibold" />}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => openEdit(r)}
                  className={'border-b transition-colors ' + (canMutate ? 'cursor-pointer hover:bg-primary/5' : '')}
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <td className="py-2 pr-3 font-mono">{r.numAbonne}</td>
                  <td className="py-2 pr-3">{r.client}</td>
                  <td className="py-2 pr-3">{r.tel1}</td>
                  <td className="py-2 pr-3">{r.formule}</td>
                  <td className="py-2 pr-3">{r.pdv}</td>
                  <td className="py-2 pr-3">{r.dateEcheance ? formatDate(r.dateEcheance) : '—'}</td>
                  <td className="py-2 pr-3"><Badge variant={STATUT_VARIANT[r.statut] ?? 'neutral'}>{r.statut}</Badge></td>
                  {canMutate && (
                    <td className="py-2" onClick={(e) => e.stopPropagation()}>
                      <RowDeleteButton path="/abonnes" id={r.id} confirmLabel={t('Résilier cet abonné ?')} onDone={refetch} />
                    </td>
                  )}
                </tr>
              ))}
              {!loading && data.rows.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>{t('Aucun résultat')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('Page')} {data.page} / {totalPages}</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={data.page <= 1 || loading}>{t('Précédent')}</Button>
              <Button variant="secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={data.page >= totalPages || loading}>{t('Suivant')}</Button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={open} onClose={() => !submitting && setOpen(false)} title={editId ? t('Modifier l’abonné') : t('Nouvel abonné')} size="lg">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>{t('N° Abonné')} <span className="text-app-subtle">({t('laisser vide = auto')})</span></FieldLabel>
              <input value={form.numAbonne} onChange={(e) => set('numAbonne', e.target.value)} className={inputCls} placeholder="ex. 12345678" />
            </div>
            <div>
              <FieldLabel>{t('Statut')}</FieldLabel>
              <select value={form.statut} onChange={(e) => set('statut', e.target.value)} className={inputCls}>
                {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><FieldLabel>{t('Prénom')}</FieldLabel><input value={form.prenom} onChange={(e) => set('prenom', e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>{t('Nom')}</FieldLabel><input value={form.nom} onChange={(e) => set('nom', e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>{t('Téléphone')}</FieldLabel><input value={form.tel1} onChange={(e) => set('tel1', e.target.value)} className={inputCls} /></div>
            <div><FieldLabel>{t('Téléphone 2')} <span className="text-app-subtle">({t('optionnel')})</span></FieldLabel><input value={form.tel2} onChange={(e) => set('tel2', e.target.value)} className={inputCls} /></div>
            <div>
              <FieldLabel>{t('Formule')}</FieldLabel>
              <select value={form.formuleId} onChange={(e) => set('formuleId', e.target.value)} className={inputCls}>
                <option value="">{t('— Choisir —')}</option>
                {formules.map((f) => <option key={f.id} value={f.id}>{f.code} — {f.nomCommercial}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>{t('Point de vente')}</FieldLabel>
              <select value={form.pdvId} onChange={(e) => set('pdvId', e.target.value)} className={inputCls}>
                <option value="">{t('— Choisir —')}</option>
                {pdvs.map((p) => <option key={p.id} value={p.id}>{p.raisonSociale}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>{t('Date d’échéance')} <span className="text-app-subtle">({t('optionnel')})</span></FieldLabel>
              <input type="date" value={form.dateEcheance} onChange={(e) => set('dateEcheance', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>{t('Annuler')}</Button>
            <Button type="submit" variant="primary" loading={submitting}>{editId ? t('Enregistrer') : t('Créer')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
