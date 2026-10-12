import { formatAmount } from '../../lib/format.js'
import { checkItems, itemTotal } from '../../lib/items.js'
import { Alert } from '../ui/Alert.jsx'

/**
 * Ítems de la factura con su suma (DESIGN.md §5.4). Si la suma no cuadra con el subtotal se
 * avisa con la diferencia.
 * @param {{ items?: Array<{ nombre: string, cantidad: number, precioUnitario: number, total?: number }>, subtotal?: number, currency?: string }} props
 */
export function InvoiceItems({ items = [], subtotal, currency }) {
  if (items.length === 0) {
    return <p className="rounded-sm bg-surface-muted px-3 py-2 text-sm text-fg-muted">La factura no trae el detalle de ítems.</p>
  }

  const { sum, difference, matches } = checkItems(items, subtotal)
  const money = (v) => formatAmount(v, currency)

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <caption className="sr-only">Ítems de la factura</caption>
          <thead className="bg-surface-muted text-xs text-fg-muted uppercase">
            <tr>
              <th scope="col" className="px-2.5 py-2 text-left font-semibold">Descripción</th>
              <th scope="col" className="px-2.5 py-2 text-right font-semibold">Cant.</th>
              <th scope="col" className="px-2.5 py-2 text-right font-semibold">P. unit.</th>
              <th scope="col" className="px-2.5 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, i) => (
              <tr key={`${item.nombre}-${i}`}>
                <td className="px-2.5 py-2 text-fg">{item.nombre}</td>
                <td className="tabular px-2.5 py-2 text-right">{item.cantidad}</td>
                <td className="tabular px-2.5 py-2 text-right">{money(item.precioUnitario)}</td>
                <td className="tabular px-2.5 py-2 text-right">{money(itemTotal(item))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border-strong bg-surface-muted/60">
            <tr>
              <th scope="row" colSpan={3} className="px-2.5 py-2 text-right text-xs font-semibold text-fg-muted uppercase">
                Suma de ítems
              </th>
              <td className="tabular px-2.5 py-2 text-right font-semibold text-fg">{money(sum)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {matches === false && (
        <Alert tone="warning" title="Los ítems no cuadran con el subtotal.">
          Suma de ítems {money(sum)} · subtotal {money(subtotal)} · diferencia{' '}
          <span className="tabular">{difference > 0 ? '+' : ''}{money(difference)}</span>. Revise la factura original.
        </Alert>
      )}
    </div>
  )
}
