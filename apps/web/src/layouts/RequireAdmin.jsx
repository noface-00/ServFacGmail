import { Outlet } from 'react-router'
import { EmptyState } from '../components/data/EmptyState.jsx'
import { PageTitle } from '../components/layout/PageTitle.jsx'
import { useSession } from '../hooks/useSession.js'

/** Guarda de rol: las rutas de Administración solo se muestran con la clave maestra. */
export function RequireAdmin() {
  const { isAdmin } = useSession()
  if (!isAdmin) {
    return (
      <>
        <PageTitle>Solo administradores</PageTitle>
        <EmptyState
          icon="lock"
          title="Solo administradores"
          description="Esta sección requiere la clave maestra del servicio. Pida acceso a un administrador."
        />
      </>
    )
  }
  return <Outlet />
}
