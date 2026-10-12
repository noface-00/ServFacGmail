import { useId } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn.js'
import { IconButton } from './Button.jsx'
import { useModal } from './useModal.js'

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

/**
 * Diálogo modal (DESIGN.md §4.7). Con `dismissible={false}` no se cierra con `Esc`, clic fuera
 * ni botón ✕ (lo usa SecretRevealDialog hasta que el usuario confirma).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  tone,
  dismissible = true,
  initialFocusRef,
  children,
}) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useModal({ open, onClose, dismissible, initialFocusRef })
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center p-4 sm:items-center"
      style={{ zIndex: 'var(--sf-z-dialog)' }}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-black/40"
        style={{ animation: 'sf-fade-in var(--sf-dur) var(--sf-ease)' }}
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role={tone === 'danger' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[calc(100svh-32px)] w-full flex-col rounded-lg border border-border bg-surface shadow-lg outline-none',
          SIZES[size],
        )}
        style={{ animation: 'sf-pop-in var(--sf-dur) var(--sf-ease)' }}
      >
        <header className="flex items-start gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-fg">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-md text-fg-muted">
                {description}
              </p>
            )}
          </div>
          {dismissible && <IconButton icon="close" label="Cerrar" size="sm" onClick={onClose} />}
        </header>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>}
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
