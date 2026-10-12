import { createContext } from 'react'

/** @type {import('react').Context<{ show: (toast: { tone?: string, title: string, description?: string }) => string, dismiss: (id: string) => void } | null>} */
export const ToastContext = createContext(null)
