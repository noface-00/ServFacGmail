import { useState } from 'react'
import { cn } from '../../lib/cn.js'
import { Icon } from './Icon.jsx'

const TONES = {
  info: { box: 'bg-info-soft border-info/30', text: 'text-info', icon: 'info' },
  success: { box: 'bg-success-soft border-success/30', text: 'text-success', icon: 'check_circle' },
  warning: { box: 'bg-warning-soft border-warning/30', text: 'text-warning', icon: 'warning' },
  danger: { box: 'bg-danger-soft border-danger/30', text: 'text-danger', icon: 'error' },
}

/**
 * Aviso dentro de la vista (DESIGN.md §4.5): icono · título (`userMessage`) · cuerpo opcional ·
 * detalle técnico plegable con botón Copiar. Los de tono `danger` se anuncian con role="alert".
 */
export function Alert({ tone = 'info', title, technicalError, action, onDismiss, className, children }) {
  const t = TONES[tone]
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-md border p-3 text-md', t.box, className)}
    >
      <Icon name={t.icon} size={20} className={cn('mt-px', t.text)} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-fg">{title}</p>}
        {children && <div className={cn('text-fg-muted', title && 'mt-0.5')}>{children}</div>}
        {technicalError && <TechnicalDetail text={technicalError} />}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-fg-subtle hover:text-fg"
        >
          <Icon name="close" size={18} />
        </button>
      )}
    </div>
  )
}

function TechnicalDetail({ text }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sin permiso de portapapeles: el texto sigue visible para copiarlo a mano.
    }
  }

  return (
    <details className="group mt-2">
      <summary className="inline-flex cursor-pointer items-center gap-1 text-xs text-fg-muted select-none hover:text-fg">
        <Icon name="chevron_right" size={16} className="transition-transform group-open:rotate-90" />
        Detalle técnico
      </summary>
      <div className="mt-1.5 flex items-start gap-2 rounded-sm border border-border bg-surface p-2">
        <pre className="tabular min-w-0 flex-1 text-xs break-all whitespace-pre-wrap text-fg">{text}</pre>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs text-fg-muted hover:bg-surface-muted hover:text-fg"
        >
          <Icon name={copied ? 'check' : 'content_copy'} size={14} />
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </details>
  )
}
