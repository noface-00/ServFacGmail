import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Comportamiento común de Dialog y Drawer (DESIGN.md §4.7): trampa de foco, `Esc` para cerrar
 * (si `dismissible`), bloqueo del scroll de la página y retorno del foco al disparador al cerrar.
 * Devuelve la ref que se asigna al panel.
 */
export function useModal({ open, onClose, dismissible = true, initialFocusRef }) {
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const dismissibleRef = useRef(dismissible)

  useEffect(() => {
    onCloseRef.current = onClose
    dismissibleRef.current = dismissible
  })

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement
    const panel = panelRef.current
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const first = initialFocusRef?.current ?? panel?.querySelector(FOCUSABLE) ?? panel
    first?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (dismissibleRef.current) {
          event.stopPropagation()
          onCloseRef.current?.()
        }
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll(FOCUSABLE)]
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = overflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open, initialFocusRef])

  return panelRef
}
