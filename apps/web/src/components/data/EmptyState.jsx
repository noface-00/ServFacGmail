import { cn } from '../../lib/cn.js'
import { Icon } from '../ui/Icon.jsx'

/** Estado vacío (DESIGN.md §4.9): icono de 40 px, título, una línea de explicación y una acción. */
export function EmptyState({ icon = 'inbox', title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <Icon name={icon} size={40} className="text-fg-subtle" />
      <p className="mt-3 text-lg font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-md text-md text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
