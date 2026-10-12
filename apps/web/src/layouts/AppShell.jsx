import { HealthIndicator } from '../components/layout/HealthIndicator.jsx'
import { useHealth } from '../hooks/useHealth.js'
import { useSession } from '../hooks/useSession.js'
import { formatDateTime } from '../lib/format.js'
import { AppLayout } from './AppLayout.jsx'

/** AppLayout conectado a la sesión y al estado de la API. */
export function AppShell() {
  const { isAdmin, logout } = useSession()
  const health = useHealth()

  return (
    <AppLayout
      isAdmin={isAdmin}
      health={
        <HealthIndicator status={health.status} checkedAt={health.checkedAt ? formatDateTime(health.checkedAt) : undefined} />
      }
      onLogout={() => logout()}
    />
  )
}
