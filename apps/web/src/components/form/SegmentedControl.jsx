import { useRef } from 'react'
import { cn } from '../../lib/cn.js'
import { Icon } from '../ui/Icon.jsx'

/**
 * Grupo de opciones excluyentes (p. ej. Simple | Consulta avanzada).
 * Se comporta como un radiogroup: flechas izquierda/derecha cambian la selección.
 * @param {{ options: Array<{ value: string, label: string, icon?: string }>, value: string, onChange: (v: string) => void, label: string }} props
 */
export function SegmentedControl({ options, value, onChange, label, disabled, className }) {
  const refs = useRef([])

  function handleKeyDown(event, index) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const next = (index + step + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid gap-1 rounded-md bg-surface-muted p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => (refs.current[index] = el)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'flex h-8 max-md:h-10 items-center justify-center gap-1.5 rounded-sm px-3 text-md transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'bg-surface font-semibold text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
            )}
          >
            {option.icon && <Icon name={option.icon} size={18} />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
