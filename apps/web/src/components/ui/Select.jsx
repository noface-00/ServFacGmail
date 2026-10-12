import { useId } from 'react'
import { cn } from '../../lib/cn.js'
import { Field } from '../form/Field.jsx'
import { controlClasses, describedBy } from '../form/fieldProps.js'
import { Icon } from './Icon.jsx'

/**
 * Select nativo con el estilo del sistema.
 * @param {{ options: Array<{ value: string, label: string }>, placeholder?: string }} props
 */
export function Select({ label, hint, error, icon, mono, required, options, placeholder, className, id, ...props }) {
  const autoId = useId()
  const selectId = id ?? autoId

  return (
    <Field id={selectId} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative">
        {icon && (
          <Icon name={icon} size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
        )}
        <select
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, { hint, error })}
          className={cn(controlClasses({ error, icon, mono }), 'h-9 appearance-none pr-9')}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="expand_more"
          size={18}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-subtle"
        />
      </div>
    </Field>
  )
}
