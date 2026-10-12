import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from '../App.jsx'
import { AppProviders } from '../AppProviders.jsx'
import { createQueryClient } from '../lib/queryClient.js'
import { saveSession } from '../lib/storage.js'

/**
 * Renderiza la app completa en `route`. Con `session` se precarga la sesión en sessionStorage,
 * como si el usuario ya hubiera entrado.
 */
export function renderApp(route = '/', { session } = {}) {
  if (session) saveSession(session)
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } })
  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </AppProviders>,
  )
}
