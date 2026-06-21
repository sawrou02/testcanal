import { useState } from 'react'
import { Icon } from './Icon'
import { useToast } from './Toast'
import { deleteResource } from '../../lib/api'

interface Props {
  path: string
  id: string
  confirmLabel?: string
  onDone: () => void
}

/** Trash button for a table row: confirms, calls DELETE, toasts, refetches. */
export function RowDeleteButton({ path, id, confirmLabel = 'Supprimer cet élément ?', onDone }: Props) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(confirmLabel)) return
    setBusy(true)
    try {
      await deleteResource(path, id)
      toast.success('Supprimé ✓')
      onDone()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Suppression impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      title="Supprimer"
      className="text-danger hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      <Icon name="trash" size={16} />
    </button>
  )
}
