import { formatAmount, isKnownCurrency } from '../../lib/format.js'
import { invoiceOrigin, totalsByCurrency } from '../../lib/invoices.js'
import { StatCard } from '../data/StatCard.jsx'
import { Alert } from '../ui/Alert.jsx'
import { Badge } from '../ui/Badge.jsx'

/** Resumen del escaneo (DESIGN.md §5.3): cifras clave y aviso de `truncated`. */
export function ScanSummary({ result }) {
  const { facturas, count, fallidas, truncated } = result
  const totals = totalsByCurrency(facturas)
  const [main, ...others] = totals
  const aiCount = facturas.filter((f) => invoiceOrigin(f) === 'pdfAi').length

  return (
    <div className="flex flex-col gap-3">
      {truncated && (
        <Alert tone="warning" title="Se alcanzó el límite de 500 correos por escaneo.">
          Acote la fecha o la consulta para ver el resto.
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Facturas encontradas" icon="receipt_long" value={count ?? facturas.length} />
        <StatCard
          label="Total acumulado"
          unit={main && isKnownCurrency(main.currency) ? main.currency : undefined}
          value={main ? formatAmount(main.total, main.currency) : '—'}
          detail={
            others.length > 0
              ? others.map((t) => `${t.currency ?? 'Sin moneda'} ${formatAmount(t.total, t.currency)}`).join(' · ')
              : main && !isKnownCurrency(main.currency)
                ? 'Moneda desconocida'
                : undefined
          }
        />
        <StatCard
          label="Leídas por IA"
          value={aiCount}
          tone={aiCount > 0 ? 'warning' : 'neutral'}
          aside={<Badge preset="pdfAi" />}
          detail={aiCount > 0 ? 'Revise los montos' : undefined}
        />
        <StatCard
          label="Fallidas"
          value={fallidas.length}
          tone={fallidas.length > 0 ? 'danger' : 'neutral'}
          detail={fallidas.length > 0 ? 'Requieren revisión' : undefined}
        />
      </div>
    </div>
  )
}
