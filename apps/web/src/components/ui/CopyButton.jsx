import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn.js'
import { Icon } from './Icon.jsx'

/** Botón pequeño que copia `text` al portapapeles y confirma con «Copiado» durante 2 s. */
export function CopyButton({ text, label = 'Copiar', className }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Sin permiso de portapapeles: el texto sigue visible para copiarlo a mano.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copiado' : label}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs text-fg-muted hover:bg-surface-muted hover:text-fg',
        className,
      )}
    >
      <Icon name={copied ? 'check' : 'content_copy'} size={14} />
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}
