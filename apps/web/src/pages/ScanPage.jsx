import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { EmptyState } from '../components/data/EmptyState.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { FailedList } from '../components/scan/FailedList.jsx'
import { InvoiceTable } from '../components/scan/InvoiceTable.jsx'
import { ScanForm } from '../components/scan/ScanForm.jsx'
import { ScanProgress } from '../components/scan/ScanProgress.jsx'
import { ScanSummary } from '../components/scan/ScanSummary.jsx'
import { Alert } from '../components/ui/Alert.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Dialog } from '../components/ui/Dialog.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { useAccounts } from '../hooks/useAccounts.js'
import { useCountdown } from '../hooks/useCountdown.js'
import { useScan } from '../hooks/useScan.js'
import { useSelectedAccount } from '../hooks/useSelectedAccount.js'
import { useSession } from '../hooks/useSession.js'
import { useToast } from '../hooks/useToast.js'
import { cn } from '../lib/cn.js'
import { toCsv } from '../lib/csv.js'
import { downloadBlob } from '../lib/download.js'
import { formatDateTime, formatRelative } from '../lib/format.js'
import { invoiceEmail, invoiceOrigin } from '../lib/invoices.js'
import { buildScanPayload, defaultScanForm, mapApiFieldErrors, validateScanForm } from '../lib/scanForm.js'

const RATE_LIMIT_FALLBACK_S = 60

const TITLES = {
  received: { title: 'Facturas recibidas', description: 'Facturas que le enviaron sus proveedores.' },
  sent: { title: 'Facturas emitidas', description: 'Facturas que usted envió a sus clientes.' },
}

const ORIGIN_LABEL = { xml: 'XML', pdfAi: 'PDF (IA)', unknown: '' }

/** Escanear → Recibidas / Emitidas (DESIGN.md §5.3). Misma pantalla para ambos tipos. */
export default function ScanPage({ kind }) {
  const { isAdmin } = useSession()
  const { accounts } = useAccounts()
  const { selectedAccount, selectAccount } = useSelectedAccount()
  const scan = useScan(kind)
  const toast = useToast()
  const navigate = useNavigate()

  const [values, setValues] = useState(() => scan.last?.form ?? defaultScanForm())
  const [clientErrors, setClientErrors] = useState({})
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [cooldownWindow, setCooldownWindow] = useState(null)
  const cooldown = useCountdown(cooldownWindow)

  const error = scan.error?.code === 'canceled' ? null : scan.error
  const apiFieldErrors = error?.status === 400 ? mapApiFieldErrors(error.technicalError) : {}
  const errors = { ...apiFieldErrors, ...clientErrors }
  const ctx = { accountEmail: selectedAccount, kind }

  function change(patch) {
    setValues((v) => ({ ...v, ...patch }))
    const touched = Object.keys(patch).map((k) => (k === 'useDefaultList' ? 'emails' : k))
    setClientErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !touched.includes(k) && k !== 'mode')))
  }

  function submit() {
    const found = validateScanForm(values, ctx)
    setClientErrors(found)
    if (Object.keys(found).length > 0) return
    if (scan.last) setConfirmReplace(true)
    else run()
  }

  function run() {
    setConfirmReplace(false)
    scan.resetError()
    scan.start(buildScanPayload(values, ctx), values, {
      onError: (err) => {
        if (err.code === 'canceled') {
          toast.show({ tone: 'info', title: 'Escaneo cancelado', description: 'El servidor puede seguir procesando la solicitud.' })
        } else if (err.status === 429) {
          const from = Date.now()
          setCooldownWindow({ from, until: from + (err.retryAfter ?? RATE_LIMIT_FALLBACK_S) * 1000 })
        }
      },
    })
  }

  function exportCsv(rows) {
    const csv = toCsv(rows, [
      { header: 'Fecha emisión', value: (r) => r.fechaEmision },
      { header: 'Emisor', value: (r) => r.supplierName },
      { header: 'RUC/RUT', value: (r) => r.supplierRuc },
      { header: 'N.º factura', value: (r) => r.numeroFactura },
      { header: 'Subtotal', value: (r) => r.subtotal },
      { header: 'IVA', value: (r) => r.iva },
      { header: 'Total', value: (r) => r.total },
      { header: 'Moneda', value: (r) => r.moneda },
      { header: 'Origen', value: (r) => ORIGIN_LABEL[invoiceOrigin(r)] },
      { header: kind === 'sent' ? 'Destinatario' : 'Remitente', value: (r) => invoiceEmail(r, kind) },
      { header: 'Archivo', value: (r) => r.filename },
      { header: 'Clave de acceso', value: (r) => r.claveAcceso },
      { header: 'ID de mensaje', value: (r) => r.messageId },
    ])
    const date = new Date().toISOString().slice(0, 10)
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `facturas-${kind === 'sent' ? 'emitidas' : 'recibidas'}-${date}.csv`)
  }

  const submitLabel = cooldown > 0 ? `Espere ${cooldown} s` : 'Escanear'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={TITLES[kind].title} description={TITLES[kind].description} actions={<ScanTabs />} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section className="lg:col-span-4" aria-label="Formulario de escaneo">
          <ScanForm
            kind={kind}
            values={values}
            errors={errors}
            accounts={accounts}
            accountEmail={selectedAccount}
            onAccountChange={selectAccount}
            onChange={change}
            onSubmit={submit}
            disabled={scan.isRunning}
            submitLabel={submitLabel}
            submitDisabled={cooldown > 0}
            footer={
              accounts.length === 0 && (
                <p className="text-sm text-fg-muted">
                  {isAdmin ? 'Conecte una cuenta de Gmail en Administración para poder escanear.' : 'Pida a un administrador que conecte una cuenta.'}
                </p>
              )
            }
          />
        </section>

        <section className="flex min-w-0 flex-col gap-4 lg:col-span-8" aria-label="Resultados">
          {error && (
            <ScanError
              error={error}
              cooldown={cooldown}
              isAdmin={isAdmin}
              onConnect={() => navigate('/admin/cuentas')}
              onRetry={run}
            />
          )}

          {scan.isRunning ? (
            <ScanProgress startedAt={scan.startedAt} onCancel={scan.cancel} />
          ) : scan.last ? (
            <>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
                <Icon name="history" size={16} />
                <span title={formatDateTime(scan.last.finishedAt)}>Último escaneo {formatRelative(scan.last.finishedAt)}</span>
                <span aria-hidden>·</span>
                <span className="tabular">{scan.last.payload.accountEmail}</span>
              </p>
              <ScanSummary result={scan.last.result} />
              <InvoiceTable invoices={scan.last.result.facturas} kind={kind} onExport={exportCsv} />
              <FailedList failures={scan.last.result.fallidas} />
            </>
          ) : (
            !error && (
              <div className="rounded-md border border-dashed border-border-strong bg-surface">
                <EmptyState
                  icon="document_scanner"
                  title="Aún no hay resultados"
                  description="Elija una cuenta y una fecha para buscar facturas."
                />
              </div>
            )
          )}
        </section>
      </div>

      <Dialog
        open={confirmReplace}
        onClose={() => setConfirmReplace(false)}
        title="¿Reemplazar los resultados actuales?"
        description="El nuevo escaneo sustituirá la tabla que está viendo. Exporte el CSV antes si lo necesita."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReplace(false)}>
              Cancelar
            </Button>
            <Button icon="document_scanner" onClick={run}>
              Escanear de nuevo
            </Button>
          </>
        }
      />
    </div>
  )
}

/** Error del escaneo según DESIGN.md §6.1. */
function ScanError({ error, cooldown, isAdmin, onConnect, onRetry }) {
  if (error.status === 404) {
    return (
      <Alert
        tone="info"
        title={error.userMessage}
        technicalError={error.technicalError}
        action={
          isAdmin && (
            <Button variant="admin" size="sm" icon="add_link" onClick={onConnect}>
              Conectar esta cuenta
            </Button>
          )
        }
      />
    )
  }
  if (error.status === 429) {
    return (
      <Alert tone="warning" title={error.userMessage} technicalError={error.technicalError}>
        {cooldown > 0 ? `Podrá escanear de nuevo en ${cooldown} s.` : 'Ya puede volver a escanear.'}
      </Alert>
    )
  }
  if (error.status === 0) {
    return (
      <Alert
        tone="danger"
        title={error.userMessage}
        technicalError={error.technicalError}
        action={
          <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>
            Reintentar
          </Button>
        }
      />
    )
  }
  return <Alert tone="danger" title={error.userMessage} technicalError={error.technicalError} />
}

function ScanTabs() {
  const tab = ({ isActive }) =>
    cn(
      'flex h-8 items-center gap-1.5 rounded-sm px-3 text-md transition-colors',
      isActive ? 'bg-surface font-semibold text-primary shadow-sm' : 'text-fg-muted hover:text-fg',
    )
  return (
    <nav aria-label="Tipo de escaneo" className="flex gap-1 rounded-md bg-surface-muted p-1">
      <NavLink to="/escanear/recibidas" className={tab}>
        <Icon name="inbox" size={18} />
        Recibidas
      </NavLink>
      <NavLink to="/escanear/emitidas" className={tab}>
        <Icon name="send" size={18} />
        Emitidas
      </NavLink>
    </nav>
  )
}
