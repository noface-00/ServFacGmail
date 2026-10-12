import { useMemo, useState } from 'react'
import { formatAmount, formatDate, toDate } from '../../lib/format.js'
import { invoiceEmail, invoiceKey, invoiceOrigin, matchesSearch } from '../../lib/invoices.js'
import { DataTable } from '../data/DataTable.jsx'
import { EmptyState } from '../data/EmptyState.jsx'
import { MoneyCell } from '../data/MoneyCell.jsx'
import { SegmentedControl } from '../form/SegmentedControl.jsx'
import { Badge } from '../ui/Badge.jsx'
import { Button } from '../ui/Button.jsx'
import { Icon } from '../ui/Icon.jsx'

const ORIGIN_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'xml', label: 'XML' },
  { value: 'pdfAi', label: 'PDF · IA' },
]

/**
 * Tabla de facturas (DESIGN.md §5.3) con búsqueda, filtro por origen y exportación de lo visible.
 * Las filas que recibe `renderActions` / `onRowClick` llevan además `_key` y `_origin`.
 * @param {{ invoices: import('../../api/routes/scan.js').Invoice[], kind: 'received' | 'sent', onExport: (rows: any[]) => void, renderActions?: (invoice: any) => import('react').ReactNode, onRowClick?: (invoice: any) => void }} props
 */
export function InvoiceTable({ invoices, kind, onExport, renderActions, onRowClick }) {
  const [search, setSearch] = useState('')
  const [origin, setOrigin] = useState('all')

  const rows = useMemo(
    () =>
      invoices
        .map((inv, index) => ({ ...inv, _key: invoiceKey(inv, index), _origin: invoiceOrigin(inv) }))
        .filter((inv) => (origin === 'all' || inv._origin === origin) && matchesSearch(inv, search, kind)),
    [invoices, origin, search, kind],
  )

  const columns = [
    {
      key: 'fechaEmision',
      header: 'Fecha emisión',
      sortable: true,
      sortValue: (r) => toDate(r.fechaEmision),
      render: (r) => <span className="whitespace-nowrap">{formatDate(r.fechaEmision)}</span>,
    },
    {
      key: 'supplierName',
      header: 'Emisor',
      sortable: true,
      render: (r) => (
        <div className="min-w-[180px]">
          <p className="font-medium text-fg">{r.supplierName ?? '—'}</p>
          {r.supplierRuc && <p className="tabular text-xs text-fg-muted">{r.supplierRuc}</p>}
        </div>
      ),
    },
    { key: 'numeroFactura', header: 'N.º factura', sortable: true, mono: true, className: 'whitespace-nowrap', render: (r) => r.numeroFactura ?? '—' },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortable: true,
      render: (r) => (
        <div className="flex flex-col items-end">
          <MoneyCell amount={r.total} currency={r.moneda} strong />
          {(r.subtotal !== undefined || r.iva !== undefined) && (
            <span className="tabular text-xs whitespace-nowrap text-fg-subtle">
              Sub. {formatAmount(r.subtotal, r.moneda)} · IVA {formatAmount(r.iva, r.moneda)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: '_origin',
      header: 'Origen',
      render: (r) => (r._origin === 'unknown' ? <Badge preset="noData" /> : <Badge preset={r._origin} />),
    },
    {
      key: 'email',
      header: kind === 'sent' ? 'Destinatario' : 'Remitente',
      sortable: true,
      // Columna secundaria: solo en pantallas anchas. Sigue en la búsqueda, el CSV y el detalle.
      className: 'hidden 2xl:table-cell',
      headerClassName: 'hidden 2xl:table-cell',
      sortValue: (r) => invoiceEmail(r, kind),
      render: (r) => <span className="tabular block max-w-[220px] truncate text-xs text-fg-muted" title={invoiceEmail(r, kind)}>{invoiceEmail(r, kind) ?? '—'}</span>,
    },
  ]
  if (renderActions) {
    columns.push({ key: 'actions', header: <span className="sr-only">Acciones</span>, align: 'right', render: renderActions })
  }

  const filtered = rows.length !== invoices.length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Buscar facturas</span>
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por emisor, RUC, número o correo"
              className="h-9 w-full rounded-sm border border-border-strong bg-surface pr-3 pl-9 text-md text-fg outline-none placeholder:text-fg-subtle focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <SegmentedControl label="Filtrar por origen" options={ORIGIN_FILTERS} value={origin} onChange={setOrigin} className="sm:w-72" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-fg-muted" aria-live="polite">
            {filtered ? `${rows.length} de ${invoices.length} facturas` : `${invoices.length} facturas`}
          </span>
          <Button variant="secondary" size="sm" icon="download" disabled={rows.length === 0} onClick={() => onExport(rows)}>
            Exportar CSV
          </Button>
        </div>
      </div>

      <DataTable
        caption="Facturas encontradas"
        columns={columns}
        rows={rows}
        rowKey={(r) => r._key}
        onRowClick={onRowClick}
        initialSort={{ key: 'fechaEmision', direction: 'desc' }}
        empty={
          filtered ? (
            <EmptyState icon="filter_alt_off" title="Ninguna factura coincide con el filtro" description="Cambie la búsqueda o el filtro de origen." />
          ) : (
            <EmptyState
              icon="search_off"
              title="No se encontraron facturas"
              description="No se encontraron facturas con esos criterios. Pruebe con una fecha anterior o revise la lista de correos."
            />
          )
        }
      />
    </div>
  )
}
