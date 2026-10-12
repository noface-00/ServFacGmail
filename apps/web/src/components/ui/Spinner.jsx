import { cn } from '../../lib/cn.js'

/** Indicador circular de carga. Con `label` se anuncia como estado. */
export function Spinner({ size = 16, label, className }) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent',
        className,
      )}
      style={{ width: size, height: size }}
    />
  )
}
