import { Badge } from '../ui/Badge.jsx'
import { Button, IconButton } from '../ui/Button.jsx'
import { Logo } from './Logo.jsx'

/**
 * Barra superior de 56 px (DESIGN.md §2): logo · selector de cuenta · estado de la API · sesión.
 * Los bloques dinámicos llegan como nodos (`accountSelector`, `health`) para que el componente
 * siga siendo de presentación.
 */
export function TopBar({ accountSelector, health, isAdmin, onLogout, onOpenMenu }) {
  return (
    <header
      className="fixed inset-x-0 top-0 flex h-14 items-center gap-3 border-b border-border bg-surface px-4"
      style={{ zIndex: 'var(--sf-z-nav)' }}
    >
      {onOpenMenu && (
        <IconButton icon="menu" label="Abrir navegación" className="md:hidden" onClick={onOpenMenu} />
      )}
      <div className="nav:w-[200px]">
        <Logo />
      </div>
      <div className="flex min-w-0 flex-1 justify-center">{accountSelector}</div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-flex">{health}</span>
        {isAdmin && <Badge preset="admin" />}
        {onLogout && (
          <Button variant="ghost" size="sm" icon="logout" onClick={onLogout}>
            <span className="hidden sm:inline">Cerrar sesión</span>
          </Button>
        )}
      </div>
    </header>
  )
}
