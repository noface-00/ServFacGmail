import { useState } from 'react'
import { DataTable } from '../components/data/DataTable.jsx'
import { EmptyState } from '../components/data/EmptyState.jsx'
import { MoneyCell } from '../components/data/MoneyCell.jsx'
import { StatCard } from '../components/data/StatCard.jsx'
import { DateInput } from '../components/form/DateInput.jsx'
import { EmailChipsInput } from '../components/form/EmailChipsInput.jsx'
import { SegmentedControl } from '../components/form/SegmentedControl.jsx'
import { TextareaCounter } from '../components/form/TextareaCounter.jsx'
import { AdminSection } from '../components/layout/AdminSection.jsx'
import { HealthIndicator } from '../components/layout/HealthIndicator.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { Alert } from '../components/ui/Alert.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Button, IconButton } from '../components/ui/Button.jsx'
import { Dialog } from '../components/ui/Dialog.jsx'
import { Drawer } from '../components/ui/Drawer.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { Spinner } from '../components/ui/Spinner.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { useToast } from '../hooks/useToast.js'
import { AppLayout } from '../layouts/AppLayout.jsx'

const SAMPLE_ROWS = [
  { id: '1', fecha: '2026-09-02', proveedor: 'Distribuidora Andina S.A.', ruc: '1790012345001', total: 1250.5, moneda: 'USD', origen: 'xml' },
  { id: '2', fecha: '2026-09-15', proveedor: 'Servicios Contables Ltda.', ruc: '76.543.210-K', total: 389000, moneda: 'CLP', origen: 'pdfAi' },
  { id: '3', fecha: '2026-08-28', proveedor: 'Papelería Central', ruc: '20512345678', total: 87.2, moneda: null, origen: 'zip' },
]

const COLUMNS = [
  { key: 'fecha', header: 'Fecha', sortable: true, mono: true },
  {
    key: 'proveedor',
    header: 'Proveedor',
    sortable: true,
    render: (r) => (
      <div>
        <p className="font-medium">{r.proveedor}</p>
        <p className="tabular text-xs text-fg-muted">{r.ruc}</p>
      </div>
    ),
  },
  { key: 'total', header: 'Total', sortable: true, align: 'right', render: (r) => <MoneyCell amount={r.total} currency={r.moneda} strong /> },
  { key: 'origen', header: 'Origen', render: (r) => <Badge preset={r.origen} /> },
]

/** Catálogo de componentes de la Fase 1. Solo existe en desarrollo (ver App.jsx). */
export default function KitPage() {
  const toast = useToast()
  const { theme, setTheme: changeTheme } = useTheme()
  const [mode, setMode] = useState('simple')
  const [emails, setEmails] = useState(['facturacion@proveedor.com', 'correo-invalido'])
  const [query, setQuery] = useState('from:facturas@proveedor.com has:attachment')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tableState, setTableState] = useState('data')

  return (
    <AppLayout isAdmin health={<HealthIndicator status="online" />} onLogout={() => toast.show({ title: 'Cerrar sesión (demo)' })}>
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Solo desarrollo"
          title="Kit de componentes"
          description="Fase 1: tokens, componentes base y layout."
          actions={
            <SegmentedControl
              label="Tema"
              value={theme}
              onChange={changeTheme}
              options={[
                { value: 'system', label: 'Sistema', icon: 'contrast' },
                { value: 'light', label: 'Claro', icon: 'light_mode' },
                { value: 'dark', label: 'Oscuro', icon: 'dark_mode' },
              ]}
            />
          }
        />

        <KitSection title="Botones">
          <div className="flex flex-wrap items-center gap-2">
            <Button icon="document_scanner">Escanear</Button>
            <Button variant="secondary" icon="download">Descargar PDF</Button>
            <Button variant="ghost">Cancelar</Button>
            <Button variant="danger" icon="link_off">Desconectar</Button>
            <Button variant="admin" icon="add_link">Conectar cuenta de Gmail</Button>
            <Button loading>Escaneando</Button>
            <Button disabled>Deshabilitado</Button>
            <IconButton icon="more_vert" label="Más acciones" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Pequeño</Button>
            <Button size="md">Mediano</Button>
            <Button size="lg">Grande</Button>
          </div>
        </KitSection>

        <KitSection title="Iconos, carga y badges">
          <div className="flex flex-wrap items-center gap-3 text-fg-muted">
            <Icon name="inbox" />
            <Icon name="key" filled />
            <Spinner />
            <Spinner size={24} className="text-primary" />
            <Skeleton className="h-4 w-32" />
            <HealthIndicator status="online" />
            <HealthIndicator status="offline" />
            <HealthIndicator status="checking" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['xml', 'pdfAi', 'zip', 'noData', 'active', 'revoked', 'admin'].map((p) => (
              <Badge key={p} preset={p} />
            ))}
            <Badge>Todas las cuentas</Badge>
            <Badge tone="info">3 cuentas</Badge>
          </div>
        </KitSection>

        <KitSection title="Formularios">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Clave de API" type="password" icon="key" placeholder="sfg_…" hint="Se guarda solo durante la sesión." />
            <Input label="Correo" type="email" icon="alternate_email" error="Correo no válido" defaultValue="contabilidad@" />
            <Select
              label="Cuenta de Gmail"
              icon="alternate_email"
              mono
              defaultValue="contabilidad@empresa.com"
              options={[
                { value: 'contabilidad@empresa.com', label: 'contabilidad@empresa.com' },
                { value: 'pagos@empresa.com', label: 'pagos@empresa.com' },
              ]}
            />
            <DateInput label="Emisión desde" required defaultValue="2026-09-01" />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg">Modo de consulta</span>
              <SegmentedControl
                label="Modo de consulta"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'simple', label: 'Simple' },
                  { value: 'advanced', label: 'Consulta avanzada' },
                ]}
              />
            </div>
            <TextareaCounter
              label="Consulta avanzada"
              mono
              maxLength={1000}
              showCounterFrom={0}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              hint="Sintaxis de Gmail: from:, after:, has:attachment"
            />
            <EmailChipsInput
              className="md:col-span-2"
              label="Correos de proveedores"
              value={emails}
              onChange={setEmails}
              hint="Separe con coma, espacio o Enter."
            />
          </div>
        </KitSection>

        <KitSection title="Avisos y toasts">
          <div className="flex flex-col gap-3">
            <Alert tone="info" title="La cuenta ventas@empresa.com no está conectada." />
            <Alert tone="success" title="Escaneo completado." />
            <Alert tone="warning" title="Se alcanzó el límite de 500 correos por escaneo.">
              Acote la fecha o la consulta para ver el resto.
            </Alert>
            <Alert tone="danger" title="No se pudo completar el escaneo." technicalError="Error: invalid_grant (Token has been expired or revoked.)" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => toast.show({ tone: 'success', title: 'Cuenta desconectada' })}>Toast éxito</Button>
            <Button variant="secondary" onClick={() => toast.show({ tone: 'danger', title: 'No se pudo descargar el PDF', description: 'Inténtelo de nuevo.' })}>Toast error</Button>
            <Button variant="secondary" onClick={() => toast.show({ tone: 'info', title: 'PDF descargado' })}>Toast info</Button>
          </div>
        </KitSection>

        <KitSection title="Diálogo y drawer">
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => setDialogOpen(true)}>Revocar clave…</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Ver detalle</Button>
          </div>
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            tone="danger"
            title="¿Revocar la clave «ERP contable»?"
            description="Los sistemas que la usen dejarán de tener acceso de inmediato."
            footer={
              <>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button variant="danger" onClick={() => setDialogOpen(false)}>Revocar clave</Button>
              </>
            }
          />
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Factura 001-001-000123"
            footer={<Button icon="download">Descargar PDF</Button>}
          >
            <p className="text-fg-muted">Contenido del detalle de factura (Fase 5).</p>
          </Drawer>
        </KitSection>

        <KitSection title="Datos">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Facturas encontradas" value="128" icon="receipt_long" />
            <StatCard label="Total acumulado" unit="USD" value="45.320,18" />
            <StatCard label="Leídas por IA" value="12" tone="warning" aside={<Badge preset="pdfAi" />} />
            <StatCard label="Fallidas" value="3" tone="danger" detail="Requieren revisión" />
          </div>
          <SegmentedControl
            label="Estado de la tabla"
            className="max-w-md"
            value={tableState}
            onChange={setTableState}
            options={[
              { value: 'data', label: 'Datos' },
              { value: 'loading', label: 'Cargando' },
              { value: 'empty', label: 'Vacía' },
              { value: 'error', label: 'Error' },
            ]}
          />
          <DataTable
            caption="Facturas de ejemplo"
            columns={COLUMNS}
            rows={tableState === 'data' ? SAMPLE_ROWS : []}
            rowKey={(r) => r.id}
            loading={tableState === 'loading'}
            error={tableState === 'error' ? { userMessage: 'No se pudo cargar la tabla.', technicalError: 'Network Error' } : null}
            empty={
              <EmptyState
                icon="search_off"
                title="No se encontraron facturas"
                description="Pruebe con una fecha anterior o revise la lista de correos."
              />
            }
            initialSort={{ key: 'fecha', direction: 'desc' }}
          />
        </KitSection>

        <AdminSection title="Claves de API" description="Ejemplo de encabezado de la zona de Administración." actions={<Button variant="admin" icon="add">Crear clave</Button>}>
          <EmptyState icon="key" title="Aún no hay claves de API" description="Cree una por cada sistema que vaya a consultar el servicio." />
        </AdminSection>
      </div>
    </AppLayout>
  )
}

function KitSection({ title, children }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {children}
    </section>
  )
}
