import { useId } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button.jsx'
import { useModal } from './useModal.js'

/**
 * Panel lateral derecho de 480 px (pantalla completa en móvil), DESIGN.md §5.4.
 * `header` reemplaza el título simple cuando se necesita un encabezado rico.
 */
export function Drawer({ open, onClose, title, header, footer, width = 480, children }) {
  const titleId = useId()
  const panelRef = useModal({ open, onClose })
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 'var(--sf-z-drawer)' }}>
      <div
        aria-hidden
        className="absolute inset-0 bg-black/30"
        style={{ animation: 'sf-fade-in var(--sf-dur) var(--sf-ease)' }}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-border bg-surface shadow-lg outline-none"
        style={{ maxWidth: width, animation: 'sf-slide-in-right var(--sf-dur) var(--sf-ease)' }}
      >
        <header className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div id={titleId} className="min-w-0 flex-1">
            {header ?? <h2 className="text-lg font-semibold text-fg">{title}</h2>}
          </div>
          <IconButton icon="close" label="Cerrar panel" size="sm" onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  )
}
