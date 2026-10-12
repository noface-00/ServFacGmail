import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { setApiEventHandlers } from '../api/axios.js'
import { useSession } from './useSession.js'

export const SESSION_EXPIRED_NOTICE = 'Su clave de API no es válida o fue revocada.'

/**
 * Conecta las reacciones globales del cliente HTTP mientras hay sesión (DESIGN.md §6.1):
 * 401 → cerrar sesión y volver a Acceso · 503 → pantalla "Servicio no disponible".
 */
export function useApiEventHandlers() {
  const { logout } = useSession()
  const navigate = useNavigate()

  useEffect(
    () =>
      setApiEventHandlers({
        onUnauthorized: () => logout(SESSION_EXPIRED_NOTICE),
        onUnavailable: () => navigate('/servicio-no-disponible'),
      }),
    [logout, navigate],
  )
}
