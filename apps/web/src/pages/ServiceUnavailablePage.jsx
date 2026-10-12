import { useState } from 'react'
import { useNavigate } from 'react-router'
import { PageTitle } from '../components/layout/PageTitle.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { useHealth } from '../hooks/useHealth.js'
import { AuthLayout } from '../layouts/AuthLayout.jsx'

/** Pantalla completa para 503 (DESIGN.md §6.1). "Reintentar" vuelve al panel si /health responde. */
export default function ServiceUnavailablePage() {
  const navigate = useNavigate()
  const health = useHealth()
  const [stillDown, setStillDown] = useState(false)
  const [checking, setChecking] = useState(false)

  async function retry() {
    setChecking(true)
    const result = await health.refetch()
    setChecking(false)
    if (result.isSuccess) navigate('/', { replace: true })
    else setStillDown(true)
  }

  return (
    <AuthLayout>
      <PageTitle>Servicio no disponible</PageTitle>
      <div className="flex flex-col items-center rounded-lg border border-border bg-surface p-8 text-center shadow-md">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-danger-soft text-danger">
          <Icon name="cloud_off" size={24} />
        </span>
        <h1 className="text-xl font-semibold text-fg">Servicio no disponible</h1>
        <p className="mt-1 text-md text-fg-muted">
          El servicio no responde o no está configurado. Inténtelo de nuevo en unos minutos.
        </p>
        {stillDown && (
          <p role="status" className="mt-3 text-sm text-danger">
            El servicio sigue sin responder.
          </p>
        )}
        <Button className="mt-5" icon="refresh" loading={checking} onClick={retry}>
          Reintentar
        </Button>
      </div>
    </AuthLayout>
  )
}
