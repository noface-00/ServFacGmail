import { formatMoney, isKnownCurrency } from '../../lib/format.js'
import { cn } from '../../lib/cn.js'
import { Badge } from '../ui/Badge.jsx'

/** Monto alineado a la derecha en mono; si la moneda falta, muestra el chip "Moneda desconocida". */
export function MoneyCell({ amount, currency, strong = false, className }) {
  const known = isKnownCurrency(currency)
  return (
    <span className={cn('inline-flex flex-col items-end gap-0.5', className)}>
      <span className={cn('tabular text-sm whitespace-nowrap', strong ? 'font-semibold text-fg' : 'text-fg')}>
        {formatMoney(amount, known ? currency : undefined)}
      </span>
      {!known && amount !== null && amount !== undefined && (
        <Badge tone="neutral" title={currency ? `Código recibido: ${currency}` : undefined}>
          Moneda desconocida
        </Badge>
      )}
    </span>
  )
}
