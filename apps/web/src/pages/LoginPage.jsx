import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { HealthIndicator } from '../components/layout/HealthIndicator.jsx'
import { PageTitle } from '../components/layout/PageTitle.jsx'
import { ThemeToggle } from '../components/layout/ThemeToggle.jsx'
import { Alert } from '../components/ui/Alert.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { Input } from '../components/ui/Input.jsx'
import { useHealth } from '../hooks/useHealth.js'
import { useLogin } from '../hooks/useLogin.js'
import { useSession } from '../hooks/useSession.js'
import { useTheme } from '../hooks/useTheme.js'
import { AuthLayout } from '../layouts/AuthLayout.jsx'

const INVALID_KEY = 'La clave no es válida.'

/** Mensaje de la pantalla de Acceso según el error de validación (DESIGN.md §5.1). */
function describeError(error) {
  if (!error) return null
  if (error.status === 401) return { field: INVALID_KEY }
  if (error.status === 503) {
    return {
      title: 'El servicio no está configurado.',
      body: 'Falta la clave maestra en el servidor. Avise al administrador.',
      technicalError: error.technicalError,
    }
  }
  return { title: error.userMessage, technicalError: error.technicalError }
}

export default function LoginPage() {
  const { isAuthenticated, notice, clearNotice } = useSession()
  const location = useLocation()
  const health = useHealth()
  const { theme, setTheme } = useTheme()
  const loginMutation = useLogin()
  const [apiKey, setApiKey] = useState('')
  const [emptyError, setEmptyError] = useState(false)

  if (isAuthenticated) {
    const from = location.state?.from
    const target = from ? `${from.pathname}${from.search ?? ''}` : '/'
    return <Navigate to={target === '/acceso' ? '/' : target} replace />
  }

  const failure = describeError(loginMutation.error)

  function handleSubmit(event) {
    event.preventDefault()
    if (!apiKey.trim()) {
      setEmptyError(true)
      return
    }
    clearNotice()
    loginMutation.mutate(apiKey)
  }

  return (
    <AuthLayout
      aside={
        <span className="flex items-center gap-2">
          <HealthIndicator status={health.status} />
          <ThemeToggle theme={theme} onChange={setTheme} />
        </span>
      }
      footer="La clave se guarda solo mientras esta pestaña esté abierta."
    >
      <div className="rounded-lg border border-border bg-surface p-6 shadow-md sm:p-8">
        <PageTitle>Acceso</PageTitle>
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Icon name="key" size={24} />
          </span>
          <h1 className="text-xl font-semibold text-fg">Acceder al panel</h1>
          <p className="mt-1 text-md text-fg-muted">Ingrese su clave de API para continuar.</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {notice && <Alert tone="warning" title={notice} />}
          {failure?.title && (
            <Alert tone="danger" title={failure.title} technicalError={failure.technicalError}>
              {failure.body}
            </Alert>
          )}

          <Input
            label="Clave de API"
            type="password"
            icon="key"
            mono
            autoComplete="off"
            autoFocus
            spellCheck={false}
            placeholder="sfg_…"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setEmptyError(false)
              if (loginMutation.isError) loginMutation.reset()
            }}
            error={emptyError ? 'Ingrese su clave de API.' : failure?.field}
            hint="Se la entrega el administrador del servicio."
          />

          <Button type="submit" size="lg" icon="login" loading={loginMutation.isPending} className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}
