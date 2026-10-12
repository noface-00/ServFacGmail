import { Link } from 'react-router'
import { PageTitle } from '../components/layout/PageTitle.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { AuthLayout } from '../layouts/AuthLayout.jsx'

/** Ruta inexistente: se explica en lugar de redirigir en silencio. */
export default function NotFoundPage() {
  return (
    <AuthLayout>
      <PageTitle>Página no encontrada</PageTitle>
      <div className="flex flex-col items-center rounded-lg border border-border bg-surface p-8 text-center shadow-md">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted text-fg-muted">
          <Icon name="explore_off" size={24} />
        </span>
        <h1 className="text-xl font-semibold text-fg">Página no encontrada</h1>
        <p className="mt-1 text-md text-fg-muted">La dirección no existe o se escribió mal.</p>
        <Link
          to="/"
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 font-medium text-on-primary hover:bg-primary-hover max-md:h-11"
        >
          <Icon name="home" size={18} />
          Volver al inicio
        </Link>
      </div>
    </AuthLayout>
  )
}
