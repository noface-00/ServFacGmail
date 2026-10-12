import { cn } from '../../lib/cn.js'

/** Título de pantalla (20 px) con descripción y acciones a la derecha. */
export function PageHeader({ title, description, eyebrow, actions, className }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-0.5 text-xs font-semibold tracking-wider text-fg-subtle uppercase">{eyebrow}</p>}
        <h1 className="text-xl font-semibold text-fg">{title}</h1>
        {description && <p className="mt-0.5 text-md text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
