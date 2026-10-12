import { useId } from 'react'
import { cn } from '../../lib/cn.js'
import { Field } from './Field.jsx'
import { controlClasses, describedBy } from './fieldProps.js'

/**
 * Textarea con contador de caracteres. El contador aparece desde `showCounterFrom`
 * (por defecto 80 % de `maxLength`) y se pone en rojo al llegar al límite.
 */
export function TextareaCounter({
  label,
  hint,
  error,
  mono,
  required,
  maxLength,
  showCounterFrom = Math.floor(maxLength * 0.8),
  value = '',
  rows = 4,
  className,
  id,
  ...props
}) {
  const autoId = useId()
  const areaId = id ?? autoId
  const length = value.length
  const counter = length >= showCounterFrom && (
    <span className={cn('tabular text-xs', length >= maxLength ? 'text-danger' : 'text-fg-muted')} aria-live="polite">
      {length} / {maxLength}
    </span>
  )

  return (
    <Field id={areaId} label={label} hint={hint} error={error} required={required} aside={counter} className={className}>
      <textarea
        id={areaId}
        rows={rows}
        value={value}
        maxLength={maxLength}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(areaId, { hint, error })}
        className={cn(controlClasses({ error, mono }), 'resize-y py-2 pr-3')}
        {...props}
      />
    </Field>
  )
}
