import { Badge } from '../ui/Badge.jsx'

/** Contenedor de la zona de Administración: franja izquierda de 3 px en --sf-admin (DESIGN.md §5.6). */
export function AdminSection({ title, description, actions, children }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 border-l-[3px] border-admin pl-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-0.5 flex items-center gap-2 text-xs font-semibold tracking-wider text-admin uppercase">
            Administración
            <Badge preset="admin" />
          </p>
          <h1 className="text-xl font-semibold text-fg">{title}</h1>
          {description && <p className="mt-0.5 text-md text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}
