import { formatAmount, formatDate } from '../../lib/format.js'
import { invoiceEmail } from '../../lib/invoices.js'
import { MoneyCell } from '../data/MoneyCell.jsx'
import { Badge } from '../ui/Badge.jsx'

/**
 * Facturas como tarjetas para móvil (DESIGN.md §3.6: nunca scroll horizontal de página).
 * Recibe las mismas filas ya filtradas que la tabla (con `_key` y `_origin`).
 */
export function InvoiceCards({ rows, kind, onOpen, renderActions }) {
  return (
    <ul aria-label="Facturas encontradas" className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r._key} className="rounded-md border border-border bg-surface p-3 shadow-sm">
          <button type="button" onClick={() => onOpen?.(r)} className="flex w-full flex-col gap-1 text-left">
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block font-semibold text-fg">{r.supplierName ?? '—'}</span>
                {r.supplierRuc && <span className="tabular block text-xs text-fg-muted">{r.supplierRuc}</span>}
              </span>
              {r._origin === 'unknown' ? <Badge preset="noData" /> : <Badge preset={r._origin} />}
            </span>
            <span className="flex items-end justify-between gap-2">
              <span className="text-sm text-fg-muted">
                <span className="tabular block">{r.numeroFactura ?? 'Sin número'}</span>
                <span className="block">{formatDate(r.fechaEmision)}</span>
              </span>
              <span className="flex flex-col items-end">
                <MoneyCell amount={r.total} currency={r.moneda} strong />
                {(r.subtotal !== undefined || r.iva !== undefined) && (
                  <span className="tabular text-xs text-fg-subtle">
                    Sub. {formatAmount(r.subtotal, r.moneda)} · IVA {formatAmount(r.iva, r.moneda)}
                  </span>
                )}
              </span>
            </span>
            {invoiceEmail(r, kind) && <span className="tabular truncate text-xs text-fg-subtle">{invoiceEmail(r, kind)}</span>}
          </button>
          {renderActions && <div className="mt-2 flex justify-end border-t border-border pt-2">{renderActions(r)}</div>}
        </li>
      ))}
    </ul>
  )
}
