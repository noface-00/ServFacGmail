import { cn } from '../../lib/cn.js'
import { Icon } from './Icon.jsx'

const TONES = {
  neutral: 'bg-surface-muted text-fg-muted border-border',
  success: 'bg-success-soft text-success border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  info: 'bg-info-soft text-info border-transparent',
  admin: 'bg-admin-soft text-admin border-transparent',
  primary: 'bg-primary-soft text-primary border-transparent',
}

/** Etiquetas predefinidas de DESIGN.md §4.4: el significado nunca depende solo del color. */
const BADGE_PRESETS = {
  xml: { tone: 'success', icon: 'code', children: 'XML' },
  pdfAi: {
    tone: 'warning',
    icon: 'auto_awesome',
    children: 'PDF · IA',
    title: 'Datos extraídos automáticamente del PDF. Revise los montos antes de usarlos.',
  },
  zip: { tone: 'neutral', icon: 'folder_zip', children: 'ZIP' },
  noData: { tone: 'neutral', children: 'Sin datos' },
  active: { tone: 'success', icon: 'check_circle', children: 'Activa' },
  revoked: { tone: 'danger', icon: 'block', children: 'Revocada' },
  admin: { tone: 'admin', icon: 'shield_person', children: 'Admin' },
}

/**
 * Chip de estado. Use `preset` para las etiquetas del sistema o `tone` + `children` libres.
 * @param {{ tone?: keyof TONES, preset?: keyof BADGE_PRESETS, icon?: string, title?: string }} props
 */
export function Badge({ preset, tone, icon, title, className, children }) {
  const p = preset ? BADGE_PRESETS[preset] : {}
  const t = tone ?? p.tone ?? 'neutral'
  const i = icon ?? p.icon
  return (
    <span
      title={title ?? p.title}
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-sm border px-1.5 text-xs font-medium whitespace-nowrap',
        TONES[t],
        className,
      )}
    >
      {i && <Icon name={i} size={14} />}
      {children ?? p.children}
    </span>
  )
}
