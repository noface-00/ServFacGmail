import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { createQueryClient } from './lib/queryClient.js'
import { SessionProvider } from './stores/SessionStore.jsx'
import { ToastProvider } from './stores/ToastStore.jsx'

/** Proveedores globales (sin router, para que las pruebas usen MemoryRouter). */
export function AppProviders({ queryClient, children }) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  return (
    <QueryClientProvider client={client}>
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}
