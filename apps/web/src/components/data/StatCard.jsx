import { cn } from '../../lib/cn.js'
import { Icon } from '../ui/Icon.jsx'

const TONES = { neutral: 'text-fg', warning: 'text-warning', danger: 'text-danger', success: 'text-success' }

/** Cifra de resumen (DESIGN.md §4.10): valor en 28 px mono, etiqueta y detalle opcional. */
export function StatCard({ label, value, unit, detail, icon, tone = 'neutral', aside, className }) {
  return (
    <div className={cn('flex flex-col gap-2 rounded-md border border-border bg-surface p-4 shadow-sm', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
          {icon && <Icon name={icon} size={16} />}
          {label}
        </span>
        {aside}
      </div>
      <div className="flex min-w-0 items-baseline gap-1.5">
        {unit && <span className="tabular text-xs text-fg-subtle">{unit}</span>}
        <span className={cn('tabular truncate text-2xl font-semibold tracking-tight', TONES[tone])}>{value}</span>
      </div>
      {detail && <span className="text-xs text-fg-subtle">{detail}</span>}
    </div>
  )
}
