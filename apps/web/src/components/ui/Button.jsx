import { cn } from '../../lib/cn.js'
import { Icon } from './Icon.jsx'
import { Spinner } from './Spinner.jsx'

const VARIANTS = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover border border-transparent',
  secondary: 'bg-surface text-fg border border-border-strong hover:bg-surface-muted',
  ghost: 'bg-transparent text-fg-muted border border-transparent hover:bg-surface-muted hover:text-fg',
  danger: 'bg-danger text-white border border-transparent hover:opacity-90',
  admin: 'bg-surface text-admin border border-admin hover:bg-admin-soft',
}

const SIZES = {
  sm: 'h-7 px-2.5 gap-1.5 text-sm',
  md: 'h-9 px-3.5 gap-2 text-md',
  lg: 'h-11 px-5 gap-2 text-md',
}

const ICON_SIZES = { sm: 16, md: 18, lg: 20 }

/**
 * Botón del sistema de diseño (DESIGN.md §4.1).
 * En `loading` se deshabilita, muestra un spinner en lugar del icono y conserva el texto.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...props
}) {
  const iconSize = ICON_SIZES[size]
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap',
        'transition-colors duration-[120ms] ease-sf select-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size={iconSize - 2} /> : icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={iconSize} />}
    </button>
  )
}

/** Botón cuadrado solo con icono; `label` es obligatorio para accesibilidad. */
export function IconButton({ icon, label, size = 'md', variant = 'ghost', className, ...props }) {
  const box = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-11 w-11' }[size]
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      className={cn('px-0', box, className)}
      {...props}
    >
      <Icon name={icon} size={ICON_SIZES[size]} />
    </Button>
  )
}
