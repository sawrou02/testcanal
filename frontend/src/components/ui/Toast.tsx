import { createContext, useContext, useState, useCallback } from 'react'
import { cn } from '../../lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => removeToast(id), 4000)
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const typeConfig: Record<ToastType, { bg: string; text: string; icon: string }> = {
  success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: '✓' },
  error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: '✕' },
  warning: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', icon: '!' },
  info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: 'i' },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const config = typeConfig[toast.type]
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in',
        config.bg,
      )}
    >
      <span className={cn('font-bold text-sm shrink-0', config.text)}>{config.icon}</span>
      <p className={cn('text-sm flex-1', config.text)}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className={cn('text-sm font-bold shrink-0', config.text)}
      >
        ×
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return {
    success: (msg: string) => ctx.addToast('success', msg),
    error: (msg: string) => ctx.addToast('error', msg),
    warning: (msg: string) => ctx.addToast('warning', msg),
    info: (msg: string) => ctx.addToast('info', msg),
  }
}
