import { NavLink } from 'react-router'
import { cn } from '../../lib/cn.js'
import { Badge } from '../ui/Badge.jsx'
import { Icon } from '../ui/Icon.jsx'

const SECTIONS = [
  {
    title: 'Escanear',
    links: [
      { to: '/escanear/recibidas', label: 'Recibidas', icon: 'inbox' },
      { to: '/escanear/emitidas', label: 'Emitidas', icon: 'send' },
    ],
  },
  {
    title: 'Cuentas',
    links: [{ to: '/cuentas', label: 'Cuentas', icon: 'alternate_email' }],
  },
]

const ADMIN_LINKS = [
  { to: '/admin/cuentas', label: 'Cuentas de Gmail', icon: 'mail_lock' },
  { to: '/admin/claves', label: 'Claves de API', icon: 'key' },
]

/**
 * Navegación lateral (DESIGN.md §3.6): 232 px, solo iconos (64 px) entre 768 y 1200 px.
 * En móvil la muestra AppLayout como drawer con `expanded`.
 */
export function Sidebar({ isAdmin, expanded = false, onNavigate }) {
  const showLabels = expanded ? '' : 'md:max-nav:sr-only'

  return (
    <nav aria-label="Principal" className="flex h-full flex-col gap-4 overflow-y-auto px-3 py-3">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className={cn('mb-1 px-2 text-xs font-semibold tracking-wider text-fg-subtle uppercase', showLabels)}>
            {section.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.links.map((link) => (
              <li key={link.to}>
                <SidebarLink link={link} showLabels={showLabels} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      {isAdmin && (
        <div>
          <div className={cn('mb-1 flex items-center justify-between px-2', showLabels)}>
            <p className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">Administración</p>
            <Badge tone="admin">Admin</Badge>
          </div>
          <ul className="flex flex-col gap-0.5 border-l-2 border-admin-soft pl-1">
            {ADMIN_LINKS.map((link) => (
              <li key={link.to}>
                <SidebarLink link={link} admin showLabels={showLabels} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  )
}

function SidebarLink({ link, admin = false, showLabels, onNavigate }) {
  return (
    <NavLink
      to={link.to}
      title={link.label}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex h-9 max-md:h-11 items-center gap-2.5 rounded-sm border-l-2 px-2 text-md transition-colors',
          isActive
            ? admin
              ? 'border-admin bg-admin-soft font-semibold text-admin'
              : 'border-primary bg-primary-soft font-semibold text-fg'
            : 'border-transparent text-fg-muted hover:bg-surface-muted hover:text-fg',
        )
      }
    >
      <Icon name={link.icon} size={20} />
      <span className={showLabels}>{link.label}</span>
    </NavLink>
  )
}
