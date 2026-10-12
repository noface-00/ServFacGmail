import { cn } from '../../lib/cn.js'

/**
 * Icono de Material Symbols Outlined. Decorativo por defecto (aria-hidden); con `label` se anuncia.
 * @param {{ name: string, size?: number, filled?: boolean, label?: string, className?: string }} props
 */
export function Icon({ name, size = 20, filled = false, label, className }) {
  return (
    <span
      className={cn('material-symbols-outlined inline-block shrink-0', className)}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${Math.min(Math.max(size, 20), 48)}`,
      }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {name}
    </span>
  )
}
