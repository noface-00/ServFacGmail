import { useContext } from 'react'
import { ToastContext } from '../stores/toastContext.js'

/** Acceso a los toasts: `const toast = useToast(); toast.show({ tone: 'success', title: '…' })`. */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
