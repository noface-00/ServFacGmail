import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn.js'
import { Icon } from './Icon.jsx'

const TONES = {
  info: { bar: 'bg-info', icon: 'info', text: 'text-info' },
  success: { bar: 'bg-success', icon: 'check_circle', text: 'text-success' },
  warning: { bar: 'bg-warning', icon: 'warning', text: 'text-warning' },
  danger: { bar: 'bg-danger', icon: 'error', text: 'text-danger' },
}

/**
 * Región de toasts (DESIGN.md §4.6): abajo a la derecha, aria-live="polite".
 * @param {{ toasts: Array<{ id: string, tone?: string, title: string, description?: string }>, onDismiss: (id: string) => void, duration?: number }} props
 */
export function ToastViewport({ toasts, onDismiss, duration = 5000 }) {
  return (
    <div
      aria-live="polite"
      aria-label="Notificaciones"
      className="pointer-events-none fixed right-4 bottom-4 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2"
      style={{ zIndex: 'var(--sf-z-toast)' }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} duration={duration} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

/** Un toast. Se cierra solo tras `duration` ms; el tiempo se pausa con el puntero o el foco encima. */
export function ToastItem({ toast, duration, onDismiss }) {
  const t = TONES[toast.tone ?? 'info']
  const remaining = useRef(duration)
  const startedAt = useRef(0)
  const timer = useRef(null)

  useEffect(() => {
    start()
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function start() {
    startedAt.current = Date.now()
    timer.current = setTimeout(() => onDismiss(toast.id), remaining.current)
  }

  function pause() {
    clearTimeout(timer.current)
    remaining.current -= Date.now() - startedAt.current
  }

  return (
    <div
      role="status"
      onMouseEnter={pause}
      onMouseLeave={start}
      onFocus={pause}
      onBlur={start}
      className="pointer-events-auto relative flex gap-3 overflow-hidden rounded-md border border-border bg-surface p-3 pl-4 shadow-lg"
      style={{ animation: 'sf-pop-in var(--sf-dur) var(--sf-ease)' }}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', t.bar)} />
      <Icon name={t.icon} size={20} className={t.text} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm text-fg-muted">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar notificación"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-fg-subtle hover:text-fg"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  )
}
