import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { clearSession, getApiKey, getRole, saveSession } from '../lib/storage.js'
import { SessionContext } from './sessionContext.js'

function readSession() {
  const apiKey = getApiKey()
  const role = getRole()
  return apiKey && (role === 'admin' || role === 'client') ? { apiKey, role } : { apiKey: null, role: null }
}

/**
 * Sesión del panel: la clave de API y el rol detectado (DESIGN.md §2). Vive en sessionStorage.
 * La validación de la clave la hace hooks/useLogin; aquí solo se guarda y se borra.
 * `notice` es el aviso que verá la pantalla de Acceso tras un cierre forzado (p. ej. un 401).
 */
export function SessionProvider({ children }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState(readSession)
  const [notice, setNotice] = useState(null)

  const login = useCallback(({ apiKey, role }) => {
    saveSession({ apiKey, role })
    setSession({ apiKey, role })
    setNotice(null)
  }, [])

  const logout = useCallback(
    (reason = null) => {
      clearSession()
      // Los datos en caché pertenecen a la clave anterior: no deben verse con la siguiente.
      queryClient.clear()
      setSession({ apiKey: null, role: null })
      setNotice(reason)
    },
    [queryClient],
  )

  const clearNotice = useCallback(() => setNotice(null), [])

  const value = useMemo(
    () => ({
      ...session,
      isAuthenticated: Boolean(session.apiKey),
      isAdmin: session.role === 'admin',
      notice,
      login,
      logout,
      clearNotice,
    }),
    [session, notice, login, logout, clearNotice],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
