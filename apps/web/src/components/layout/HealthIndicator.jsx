import { cn } from '../../lib/cn.js'

const STATES = {
  online: { dot: 'bg-success', label: 'API en línea' },
  offline: { dot: 'bg-danger', label: 'API sin conexión' },
  checking: { dot: 'bg-fg-subtle animate-pulse', label: 'Comprobando API…' },
}

/** Estado de GET /health en la barra superior. `checkedAt` se muestra en el title. */
export function HealthIndicator({ status = 'checking', checkedAt }) {
  const s = STATES[status]
  return (
    <span
      role="status"
      title={checkedAt ? `Última comprobación: ${checkedAt}` : undefined}
      className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-border bg-surface-muted px-2"
    >
      <span aria-hidden className={cn('h-2 w-2 rounded-full', s.dot)} />
      <span className="tabular text-xs text-fg-muted">{s.label}</span>
    </span>
  )
}
