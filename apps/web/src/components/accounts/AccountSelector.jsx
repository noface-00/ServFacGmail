import { cn } from '../../lib/cn.js'
import { Icon } from '../ui/Icon.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'

/**
 * Selector compacto de la cuenta de Gmail activa (barra superior).
 * @param {{ accounts: Array<{ email: string }>, value: string | null, onChange: (email: string) => void, loading?: boolean }} props
 */
export function AccountSelector({ accounts, value, onChange, loading = false, className }) {
  if (loading) return <Skeleton className="h-9 w-56 rounded-sm" />

  if (accounts.length === 0) {
    return (
      <span className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-dashed border-border-strong px-3 text-sm text-fg-muted">
        <Icon name="mail" size={18} />
        Sin cuentas conectadas
      </span>
    )
  }

  return (
    <label className={cn('relative block w-full max-w-[320px]', className)}>
      <span className="sr-only">Cuenta de Gmail activa</span>
      <Icon name="mail" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted" />
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'tabular h-9 w-full appearance-none truncate rounded-sm border border-border-strong bg-surface pr-9 pl-9 text-sm text-fg',
          'outline-none hover:bg-surface-muted focus:border-primary focus:ring-2 focus:ring-primary/20',
        )}
      >
        {accounts.map((a) => (
          <option key={a.email} value={a.email}>
            {a.email}
          </option>
        ))}
      </select>
      <Icon
        name="keyboard_arrow_down"
        size={18}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-muted"
      />
    </label>
  )
}
