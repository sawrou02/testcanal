import { useEffect, useState } from 'react'
import { DataTable } from '../ui/DataTable'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { KpiCard } from '../dashboard/KpiCard'
import { useResource } from '../../hooks/useResource'
import { createResource, updateResource, deleteResource, listResource } from '../../lib/api'
import { Icon } from '../ui/Icon'
import type { KpiCardData } from '../../types'

type Row = Record<string, unknown>

interface Column {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: Row) => React.ReactNode
}

interface SelectOption {
  value: string | number
  label: string
}

export interface FieldDef {
  name: string
  label: string
  type: 'text' | 'number' | 'select'
  required?: boolean
  /** For select fields: fetch options from this endpoint */
  optionsPath?: string
  /** For select fields: static options */
  options?: SelectOption[]
  /** Map a fetched option item to a {value,label} pair */
  mapOption?: (item: Record<string, unknown>) => SelectOption
}

interface CrudResourcePageProps {
  title: string
  subtitle?: string
  apiPath: string
  columns: Column[]
  kpis?: (rows: Row[]) => KpiCardData[]
  formFields: FieldDef[]
  canMutate?: boolean
  idField?: string
}

const defaultMapOption = (item: Record<string, unknown>): SelectOption => ({
  value: (item.id ?? '') as string | number,
  label: String(item.nom ?? item.raisonSociale ?? item.code ?? item.id ?? ''),
})

/** Strip a trailing query string so we can derive the mutation base path. */
function basePath(apiPath: string): string {
  const idx = apiPath.indexOf('?')
  return idx === -1 ? apiPath : apiPath.slice(0, idx)
}

interface ResourceFormProps {
  fields: FieldDef[]
  initial: Row
  submitting: boolean
  onSubmit: (values: Row) => void
  onCancel: () => void
  onDelete?: () => void
}

function ResourceForm({ fields, initial, submitting, onSubmit, onCancel, onDelete }: ResourceFormProps) {
  const [values, setValues] = useState<Row>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [optionsMap, setOptionsMap] = useState<Record<string, SelectOption[]>>({})

  useEffect(() => {
    setValues(initial)
    setErrors({})
  }, [initial])

  useEffect(() => {
    let cancelled = false
    const selectFields = fields.filter((f) => f.type === 'select' && f.optionsPath)
    selectFields.forEach(async (field) => {
      try {
        const items = await listResource<Record<string, unknown>>(field.optionsPath as string)
        if (cancelled) return
        const mapper = field.mapOption ?? defaultMapOption
        setOptionsMap((prev) => ({ ...prev, [field.name]: items.map(mapper) }))
      } catch {
        if (!cancelled) setOptionsMap((prev) => ({ ...prev, [field.name]: [] }))
      }
    })
    return () => {
      cancelled = true
    }
  }, [fields])

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    fields.forEach((field) => {
      if (field.required) {
        const v = values[field.name]
        if (v === undefined || v === null || String(v).trim() === '') {
          newErrors[field.name] = 'Ce champ est requis'
        }
      }
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    // Coerce number fields
    const out: Row = { ...values }
    fields.forEach((field) => {
      if (field.type === 'number' && out[field.name] !== undefined && out[field.name] !== '') {
        out[field.name] = Number(out[field.name])
      }
    })
    onSubmit(out)
  }

  return (
    <form id="resource-form" onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => {
        const value = values[field.name]
        const options = field.options ?? optionsMap[field.name] ?? []
        return (
          <div key={field.name} className="flex flex-col gap-1">
            <label className="text-sm font-medium text-app-text">
              {field.label}
              {field.required && <span className="text-danger"> *</span>}
            </label>
            {field.type === 'select' ? (
              <select
                value={value === undefined || value === null ? '' : String(value)}
                onChange={(e) => setValue(field.name, e.target.value)}
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Sélectionner —</option>
                {options.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                value={value === undefined || value === null ? '' : String(value)}
                onChange={(e) => setValue(field.name, e.target.value)}
                className="border border-app-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            )}
            {errors[field.name] && (
              <span className="text-xs text-danger">{errors[field.name]}</span>
            )}
          </div>
        )
      })}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-danger hover:bg-red-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Icon name="trash" size={16} /> Supprimer
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Enregistrer
          </Button>
        </div>
      </div>
    </form>
  )
}

export function CrudResourcePage({
  title,
  subtitle,
  apiPath,
  columns,
  kpis,
  formFields,
  canMutate = true,
  idField = 'id',
}: CrudResourcePageProps) {
  const toast = useToast()
  const { data, loading, refetch } = useResource<Row>(apiPath)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (row: Row) => {
    if (!canMutate) return
    setEditing(row)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
    setEditing(null)
  }

  const handleSubmit = async (values: Row) => {
    setSubmitting(true)
    try {
      const base = basePath(apiPath)
      if (editing) {
        const id = editing[idField] as string | number
        await updateResource(base, id, values)
      } else {
        await createResource(base, values)
      }
      toast.success('Enregistré ✓')
      setModalOpen(false)
      setEditing(null)
      refetch()
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!editing) return
    if (!window.confirm('Supprimer / désactiver cet élément ? Cette action retire l’élément de la liste active.')) return
    setSubmitting(true)
    try {
      const base = basePath(apiPath)
      await deleteResource(base, editing[idField] as string | number)
      toast.success('Supprimé ✓')
      setModalOpen(false)
      setEditing(null)
      refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Suppression impossible')
    } finally {
      setSubmitting(false)
    }
  }

  const kpiData = kpis ? kpis(data) : []

  const initialValues: Row = editing ?? {}

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-app-text" style={{ color: 'var(--text)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-app-muted mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {kpiData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpiData.map((kpi, i) => (
            <KpiCard
              key={i}
              label={kpi.label}
              value={kpi.value}
              delta={kpi.delta}
              deltaLabel={kpi.deltaLabel}
              color={kpi.color}
            />
          ))}
        </div>
      )}

      <div
        className="bg-white rounded-xl border border-app-border p-5 shadow-sm"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-app-text" style={{ color: 'var(--text)' }}>
            {title}
          </h3>
          {canMutate && (
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Nouveau
            </Button>
          )}
        </div>
        <DataTable
          columns={columns}
          rows={data}
          loading={loading}
          searchable
          onRowClick={canMutate ? openEdit : undefined}
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? `Modifier — ${title}` : `Nouveau — ${title}`}
      >
        <ResourceForm
          fields={formFields}
          initial={initialValues}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          onDelete={editing ? handleDelete : undefined}
        />
      </Modal>
    </div>
  )
}

export default CrudResourcePage
