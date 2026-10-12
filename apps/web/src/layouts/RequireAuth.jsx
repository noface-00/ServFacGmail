import { Navigate, Outlet, useLocation } from 'react-router'
import { useApiEventHandlers } from '../hooks/useApiEventHandlers.js'
import { useSession } from '../hooks/useSession.js'

/** Guarda de ruta: sin sesión redirige a Acceso recordando a dónde se quería ir. */
export function RequireAuth() {
  const { isAuthenticated } = useSession()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/acceso" replace state={{ from: location }} />
  return <AuthenticatedOutlet />
}

function AuthenticatedOutlet() {
  useApiEventHandlers()
  return <Outlet />
}
