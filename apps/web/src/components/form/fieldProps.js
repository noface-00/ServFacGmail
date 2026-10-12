import { cn } from '../../lib/cn.js'

/** aria-describedby para un control envuelto en Field. */
export function describedBy(id, { hint, error }) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

/** Clases compartidas por Input, Select, Textarea y DateInput. */
export function controlClasses({ error, icon, mono } = {}) {
  return cn(
    'w-full rounded-sm border bg-surface text-md text-fg placeholder:text-fg-subtle',
    'transition-colors duration-[120ms] outline-none',
    'focus:border-primary focus:ring-2 focus:ring-primary/20',
    'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-muted',
    error ? 'border-danger' : 'border-border-strong',
    icon ? 'pl-9' : 'pl-3',
    mono && 'tabular text-sm',
  )
}
