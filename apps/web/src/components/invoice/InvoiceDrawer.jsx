import { formatDate } from '../../lib/format.js'
import { invoiceEmail, invoiceOrigin } from '../../lib/invoices.js'
import { MoneyCell } from '../data/MoneyCell.jsx'
import { Badge } from '../ui/Badge.jsx'
import { Button } from '../ui/Button.jsx'
import { CopyButton } from '../ui/CopyButton.jsx'
import { Drawer } from '../ui/Drawer.jsx'
import { InvoiceItems } from './InvoiceItems.jsx'
import { PdfPreview } from './PdfPreview.jsx'

/**
 * Detalle de una factura (DESIGN.md §5.4) en un drawer de 480 px.
 * @param {{
 *   invoice: import('../../api/routes/scan.js').Invoice | null,
 *   kind: 'received' | 'sent',
 *   onClose: () => void,
 *   onDownload: () => void,
 *   downloading?: boolean,
 *   preview: { blob?: Blob, loading?: boolean, error?: any, onLoad: () => void },
 * }} props
 */
export function InvoiceDrawer({ invoice, kind, onClose, onDownload, downloading = false, preview }) {
  if (!invoice) return null
  const origin = invoiceOrigin(invoice)
  // La API usa el messageId como claveAcceso cuando la factura no trae una: no es una clave real.
  const accessKey = invoice.claveAcceso && invoice.claveAcceso !== invoice.messageId ? invoice.claveAcceso : null

  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      header={
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-fg">{invoice.supplierName ?? 'Emisor desconocido'}</h2>
            {origin !== 'unknown' && <Badge preset={origin} />}
          </div>
          <p className="tabular text-sm text-fg-muted">Factura {invoice.numeroFactura ?? 'sin número'}</p>
          <MoneyCell amount={invoice.total} currency={invoice.moneda} strong className="mt-1 items-start [&>span:first-child]:text-2xl" />
        </div>
      }
      footer={
        <Button icon="download" loading={downloading} onClick={onDownload}>
          Descargar PDF
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {origin === 'pdfAi' && (
          <p className="rounded-sm bg-warning-soft px-3 py-2 text-sm text-warning">
            Datos extraídos automáticamente del PDF. Revise los montos antes de usarlos.
          </p>
        )}

        <Section title="Emisor">
          <dl className="flex flex-col gap-1.5">
            <Row label="Nombre">{invoice.supplierName ?? '—'}</Row>
            <Row label="RUC / RUT" mono>{invoice.supplierRuc ?? '—'}</Row>
          </dl>
        </Section>

        <Section title="Documento">
          <dl className="flex flex-col gap-1.5">
            <Row label="Número" mono>{invoice.numeroFactura ?? '—'}</Row>
            <Row label="Fecha de emisión">{formatDate(invoice.fechaEmision)}</Row>
            <Row label="Moneda" mono>{invoice.moneda ?? '—'}</Row>
            <Row label="Subtotal" mono>
              <MoneyCell amount={invoice.subtotal} currency={invoice.moneda} className="items-start" />
            </Row>
            <Row label="IVA" mono>
              <MoneyCell amount={invoice.iva} currency={invoice.moneda} className="items-start" />
            </Row>
            <Row label="Clave de acceso" mono>
              {accessKey ? (
                <span className="flex items-start gap-1">
                  <span className="break-all">{accessKey}</span>
                  <CopyButton text={accessKey} label="Copiar clave de acceso" />
                </span>
              ) : (
                '—'
              )}
            </Row>
          </dl>
        </Section>

        <Section title="Correo">
          <dl className="flex flex-col gap-1.5">
            <Row label={kind === 'sent' ? 'Destinatario' : 'Remitente'} mono>{invoiceEmail(invoice, kind) ?? '—'}</Row>
            <Row label="Archivo" mono>{invoice.filename ?? '—'}</Row>
            <Row label="ID de mensaje" mono>{invoice.messageId ?? '—'}</Row>
          </dl>
        </Section>

        <Section title="Ítems">
          <InvoiceItems items={invoice.items} subtotal={invoice.subtotal} currency={invoice.moneda} />
        </Section>

        <Section title="PDF">
          {origin === 'xml' && (
            <p className="mb-2 text-xs text-fg-subtle">Esta factura se leyó del XML; se buscará el PDF del mismo correo.</p>
          )}
          <PdfPreview {...preview} />
        </Section>
      </div>
    </Drawer>
  )
}

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, mono, children }) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 text-sm">
      <dt className="text-fg-muted">{label}</dt>
      <dd className={mono ? 'tabular break-all text-fg' : 'text-fg'}>{children}</dd>
    </div>
  )
}
