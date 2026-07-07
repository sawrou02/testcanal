import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/authStore'
import { formatDate, cn } from '../../lib/utils'
import {
  listDocuments, uploadDocument, downloadDocument, deleteDocument, getDocumentText,
  listMessages, postMessage, deleteMessage, importCanal,
  type DocumentRow, type MessageRow,
} from '../../lib/api'
import { Card, PageHeader } from '../../components/ui/Section'

const MUT = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'COMPTABLE', 'LOGISTICIEN', 'COMMERCIAL']
const ADMIN = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
const CATEGORIES = ['Général', 'Rapports CANAL', 'Contrats', 'Justificatifs', 'Bordereaux', 'Autres']

function humanSize(n: number) {
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`
  return `${(n / 1024 / 1024).toFixed(1)} Mo`
}

export default function EchangesPage() {
  const toast = useToast()
  const user = useAuthStore((s) => s.user)
  const role = user?.role
  const canUpload = role ? MUT.includes(role) : false
  const canDelete = role ? ADMIN.includes(role) : false

  const [tab, setTab] = useState<'documents' | 'discussion'>('documents')

  // ---------- Documents ----------
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [cat, setCat] = useState('Général')
  const [desc, setDesc] = useState('')
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadDocs = useCallback(async () => {
    try { setDocs(await listDocuments()) } catch { /* ignore */ }
  }, [])
  useEffect(() => { void loadDocs() }, [loadDocs])

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const f of files) await uploadDocument(f, cat, desc)
      toast.success(`${files.length} fichier(s) déposé(s) ✓`)
      setDesc('')
      await loadDocs()
    } catch { toast.error("Échec de l'envoi") } finally {
      setUploading(false); if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onImport = async (d: DocumentRow) => {
    setBusyId(d.id)
    try {
      const text = await getDocumentText(d.id)
      const r = await importCanal(text)
      toast.success(`Importé : ${r.encaissementsCrees} encaissement(s), ${r.abonnesCrees} abonné(s) ✓`)
    } catch { toast.error("Échec de l'import (fichier non reconnu ?)") } finally { setBusyId(null) }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return
    try { await deleteDocument(id); await loadDocs() } catch { toast.error('Suppression impossible') }
  }

  const isCsv = (d: DocumentRow) => /\.csv$/i.test(d.filename) || d.category === 'Rapports CANAL'

  // ---------- Discussion ----------
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    try { setMessages(await listMessages()) } catch { /* ignore */ }
  }, [])
  useEffect(() => { void loadMessages() }, [loadMessages])
  useEffect(() => {
    if (tab === 'discussion') endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, tab])
  // léger rafraîchissement du fil
  useEffect(() => {
    if (tab !== 'discussion') return
    const id = window.setInterval(() => void loadMessages(), 8000)
    return () => window.clearInterval(id)
  }, [tab, loadMessages])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const c = msg.trim()
    if (!c) return
    setSending(true)
    try { await postMessage(c); setMsg(''); await loadMessages() } catch { toast.error("Échec de l'envoi") } finally { setSending(false) }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Espace Échanges" subtitle="Documents partagés et discussion d'équipe" />

      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['documents', 'discussion'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === t ? 'border-primary text-primary' : 'border-transparent text-app-muted hover:text-app-text')}>
            {t === 'documents' ? 'Documents' : 'Discussion'}
          </button>
        ))}
      </div>

      {tab === 'documents' ? (
        <div className="space-y-4">
          {canUpload && (
            <Card>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-48">
                  <label className="text-xs font-semibold text-app-muted">Catégorie</label>
                  <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-semibold text-app-muted">Description (optionnel)</label>
                  <input value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                </div>
                <div>
                  <input ref={fileRef} type="file" multiple onChange={onUpload} disabled={uploading} className="hidden" />
                  <Button variant="primary" onClick={() => fileRef.current?.click()} loading={uploading}>Déposer un fichier</Button>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div className="min-h-[300px] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-app-muted" style={{ borderColor: 'var(--border)' }}>
                    <th className="py-2 pr-3">Fichier</th>
                    <th className="py-2 pr-3">Catégorie</th>
                    <th className="py-2 pr-3">Taille</th>
                    <th className="py-2 pr-3">Déposé par</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-app-muted">Aucun document déposé</td></tr>
                  ) : docs.map((d) => (
                    <tr key={d.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-app-text">{d.filename}</div>
                        {d.description && <div className="text-xs text-app-muted">{d.description}</div>}
                      </td>
                      <td className="py-2.5 pr-3">{d.category}</td>
                      <td className="py-2.5 pr-3 font-mono">{humanSize(d.size)}</td>
                      <td className="py-2.5 pr-3">{d.uploadedByName}</td>
                      <td className="py-2.5 pr-3">{d.createdAt ? formatDate(d.createdAt) : '—'}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center justify-end gap-2">
                          {isCsv(d) && canUpload && (
                            <Button size="sm" variant="secondary" loading={busyId === d.id} onClick={() => onImport(d)}>Importer</Button>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => downloadDocument(d.id, d.filename)}>Télécharger</Button>
                          {canDelete && (
                            <button onClick={() => onDelete(d.id)} title="Supprimer" className="text-app-subtle hover:text-red-500 text-lg">×</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="flex flex-col" style={{ height: '62vh' }}>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-app-muted">Aucun message. Démarrez la discussion.</div>
              ) : messages.map((m) => {
                const mine = m.userId === user?.id
                return (
                  <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2', mine ? 'text-white' : '')}
                      style={mine ? { background: 'var(--primary)' } : { background: 'var(--app-bg)', color: 'var(--text)' }}>
                      {!mine && <div className="text-[11px] font-bold opacity-70 mb-0.5">{m.userName}</div>}
                      <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                      <div className={cn('text-[10px] mt-0.5', mine ? 'text-white/70' : 'text-app-muted')}>
                        {new Date(m.createdAt).toLocaleString('fr-FR')}
                        {canDelete && <button onClick={() => deleteMessage(m.id).then(loadMessages)} className="ml-2 opacity-70 hover:opacity-100">supprimer</button>}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="flex items-center gap-2 pt-3 border-t mt-2" style={{ borderColor: 'var(--border)' }}>
              <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Écrire un message…"
                className="flex-1 px-3 py-2.5 text-sm rounded-lg border" style={{ background: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
              <Button type="submit" variant="primary" loading={sending}>Envoyer</Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  )
}
