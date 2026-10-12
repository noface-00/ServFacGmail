import { useCallback, useMemo, useState } from 'react'
import { ToastViewport } from '../components/ui/Toast.jsx'
import { ToastContext } from './toastContext.js'

const MAX_TOASTS = 3
let nextId = 0

/** Estado global de los toasts: como máximo 3 apilados; el más antiguo sale primero. */
export function ToastProvider({ children, duration }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((toast) => {
    const id = `toast-${++nextId}`
    setToasts((list) => [...list, { ...toast, id }].slice(-MAX_TOASTS))
    return id
  }, [])

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} duration={duration} />
    </ToastContext.Provider>
  )
}
