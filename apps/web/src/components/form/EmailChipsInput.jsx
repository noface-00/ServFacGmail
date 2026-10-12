import { useId, useState } from 'react'
import { cn } from '../../lib/cn.js'
import { EMAIL_LIST_MAX, isValidEmail } from '../../lib/validation.js'
import { Icon } from '../ui/Icon.jsx'
import { Field } from './Field.jsx'

const SEPARATORS = /[\s,;]+/

/**
 * Lista de correos como chips (DESIGN.md §4.3). Separa por coma, punto y coma, espacio, Enter o
 * pegado múltiple; ignora duplicados; marca los inválidos; bloquea la entrada al llegar a `max`.
 * Los correos inválidos se conservan en `value` para que el formulario pueda rechazar el envío.
 * `suggestions` muestra botones de un clic para agregar correos conocidos (p. ej. cuentas conectadas).
 * @param {{ value: string[], onChange: (emails: string[]) => void, max?: number, suggestions?: string[], suggestionsLabel?: string }} props
 */
export function EmailChipsInput({
  label,
  hint,
  error,
  value,
  onChange,
  max = EMAIL_LIST_MAX,
  placeholder = 'Escriba un correo y pulse Enter',
  disabled,
  required,
  suggestions = [],
  suggestionsLabel = 'Sugerencias',
  className,
  id,
}) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [draft, setDraft] = useState('')
  const full = value.length >= max
  const invalidCount = value.filter((e) => !isValidEmail(e)).length
  const pendingSuggestions = suggestions.filter((s) => !value.includes(s.toLowerCase()))

  function add(raw) {
    const incoming = raw
      .split(SEPARATORS)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    if (incoming.length === 0) return
    const next = [...value]
    for (const email of incoming) {
      if (next.length >= max) break
      if (!next.includes(email)) next.push(email)
    }
    onChange(next)
  }

  function remove(email) {
    onChange(value.filter((e) => e !== email))
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';' || event.key === ' ') {
      if (!draft.trim()) {
        if (event.key === 'Enter') event.preventDefault()
        return
      }
      event.preventDefault()
      add(draft)
      setDraft('')
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      remove(value[value.length - 1])
    }
  }

  function handlePaste(event) {
    const text = event.clipboardData.getData('text')
    if (!SEPARATORS.test(text.trim())) return
    event.preventDefault()
    add(draft + text)
    setDraft('')
  }

  function handleBlur() {
    if (draft.trim()) {
      add(draft)
      setDraft('')
    }
  }

  const counter = (
    <span
      className={cn(
        'tabular rounded-sm bg-surface-muted px-1.5 py-0.5 text-xs',
        full ? 'text-danger' : 'text-fg-muted',
      )}
    >
      {value.length} / {max}
    </span>
  )

  const errorText = error ?? (invalidCount > 0 ? `${invalidCount} correo(s) no válido(s)` : undefined)

  return (
    <Field id={inputId} label={label} hint={hint} error={errorText} required={required} aside={counter} className={className}>
      <div
        className={cn(
          'flex min-h-[72px] flex-wrap content-start gap-1.5 rounded-sm border bg-surface p-2',
          'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
          errorText ? 'border-danger' : 'border-border-strong',
          disabled && 'cursor-not-allowed bg-surface-muted',
        )}
      >
        <ul className="contents" aria-label="Correos agregados">
          {value.map((email) => {
            const valid = isValidEmail(email)
            return (
              <li
                key={email}
                title={valid ? undefined : 'Correo no válido'}
                className={cn(
                  'inline-flex max-w-full items-center gap-1 rounded-sm border py-0.5 pr-1 pl-2',
                  valid ? 'border-border bg-surface-muted text-fg' : 'border-danger bg-danger-soft text-danger',
                )}
              >
                {!valid && <Icon name="error" size={14} />}
                <span className="tabular truncate text-xs">{email}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => remove(email)}
                  aria-label={`Quitar ${email}`}
                  className="flex h-5 w-5 items-center justify-center rounded-sm text-fg-subtle hover:text-danger"
                >
                  <Icon name="close" size={14} />
                </button>
              </li>
            )
          })}
        </ul>
        <input
          id={inputId}
          type="email"
          value={draft}
          disabled={disabled || full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={full ? `Máximo ${max} correos` : placeholder}
          aria-invalid={errorText ? true : undefined}
          aria-describedby={errorText ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className="min-w-[160px] flex-1 bg-transparent px-1 py-0.5 text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
      </div>
      {pendingSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-fg-muted">{suggestionsLabel}:</span>
          {pendingSuggestions.map((email) => (
            <button
              key={email}
              type="button"
              disabled={disabled || full}
              onClick={() => add(email)}
              aria-label={`Agregar ${email}`}
              className="tabular inline-flex items-center gap-0.5 rounded-sm border border-dashed border-border-strong px-1.5 py-0.5 text-xs text-fg-muted hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <Icon name="add" size={14} />
              {email}
            </button>
          ))}
        </div>
      )}
    </Field>
  )
}
