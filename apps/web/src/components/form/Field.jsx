import { cn } from '../../lib/cn.js'
import { Icon } from '../ui/Icon.jsx'

/**
 * Envoltorio común de los inputs: etiqueta arriba, ayuda y error debajo (DESIGN.md §4.2).
 * `id` debe coincidir con el del control; los ids de ayuda/error se derivan de él.
 */
export function Field({ id, label, hint, error, aside, required, className, children }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {(label || aside) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={id} className="text-xs font-medium text-fg">
              {label}
              {required && (
                <span className="ml-0.5 text-danger" aria-hidden>
                  *
                </span>
              )}
            </label>
          )}
          {aside}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1 text-xs text-danger">
          <Icon name="error" size={16} />
          <span>{error}</span>
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
