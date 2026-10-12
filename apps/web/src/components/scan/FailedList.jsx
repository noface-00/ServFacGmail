import { Badge } from '../ui/Badge.jsx'
import { Icon } from '../ui/Icon.jsx'

/**
 * Adjuntos que no se pudieron leer (`fallidas`, DESIGN.md §5.3). Plegado por defecto, con el
 * contador visible en el encabezado.
 * @param {{ failures: Array<{ messageId: string, filename?: string, error: string }> }} props
 */
export function FailedList({ failures }) {
  if (failures.length === 0) return null
  return (
    <details className="group rounded-md border border-danger/30 bg-surface">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 select-none">
        <span className="flex items-center gap-2 font-semibold text-fg">
          <Icon name="error" size={20} className="text-danger" />
          Adjuntos que no se pudieron leer
          <Badge tone="danger">{failures.length}</Badge>
        </span>
        <Icon name="expand_more" size={20} className="text-fg-muted transition-transform group-open:rotate-180" />
      </summary>
      <ul className="divide-y divide-border border-t border-border">
        {failures.map((f, i) => (
          <li key={`${f.messageId}-${f.filename ?? ''}-${i}`} className="flex flex-col gap-0.5 px-4 py-2.5">
            <span className="font-medium break-all text-fg">{f.filename ?? 'Correo sin adjunto legible'}</span>
            <span className="tabular text-xs text-fg-subtle">Mensaje {f.messageId}</span>
            <span className="text-sm break-words text-danger">{f.error}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
