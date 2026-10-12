import { useId, useState } from 'react'
import { cn } from '../../lib/cn.js'
import { Field } from '../form/Field.jsx'
import { controlClasses, describedBy } from '../form/fieldProps.js'
import { Icon } from './Icon.jsx'

/**
 * Input de texto con etiqueta, ayuda y error. `type="password"` añade el botón mostrar/ocultar.
 */
export function Input({ label, hint, error, icon, mono, required, type = 'text', className, id, aside, ...props }) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'

  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required} aside={aside} className={className}>
      <div className="relative">
        {icon && (
          <Icon name={icon} size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
        )}
        <input
          id={inputId}
          type={isPassword && revealed ? 'text' : type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, { hint, error })}
          className={cn(controlClasses({ error, icon, mono }), 'h-9 max-md:h-11', isPassword ? 'pr-10' : 'pr-3')}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Ocultar' : 'Mostrar'}
            aria-pressed={revealed}
            className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-fg-subtle hover:text-fg"
          >
            <Icon name={revealed ? 'visibility_off' : 'visibility'} size={18} />
          </button>
        )}
      </div>
    </Field>
  )
}
