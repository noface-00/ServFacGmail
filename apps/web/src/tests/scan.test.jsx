import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API, CLIENT_KEY, MASTER_KEY, server } from './msw/server.js'
import { renderApp } from './renderApp.jsx'

const admin = { apiKey: MASTER_KEY, role: 'admin' }
const client = { apiKey: CLIENT_KEY, role: 'client' }

const facturas = [
  {
    messageId: 'msg-1', attachmentId: 'att-1', filename: 'FAC-001.xml', claveAcceso: '0109202601179001234500110010010000001231234567811',
    supplierRuc: '1790012345001', supplierName: 'Distribuidora Andina S.A.', numeroFactura: '001-001-000000123',
    fechaEmision: '2026-09-15', subtotal: 100, iva: 15, total: 115, moneda: 'USD', senderEmail: 'facturas@andina.ec',
  },
  {
    messageId: 'msg-2', attachmentId: 'att-2', filename: 'factura-servicios.pdf',
    supplierRuc: '20512345678', supplierName: 'Servicios Contables SAC', numeroFactura: 'F001-889',
    fechaEmision: '2026-09-20', subtotal: 200, iva: 36, total: 236, moneda: 'USD', senderEmail: 'cobranzas@contables.pe',
  },
]
const fallidas = [{ messageId: 'msg-3', filename: 'roto.zip', error: 'ZIP file contains no XML or PDF files' }]

let lastBody
let lastPath

function scanHandler(path, response = () => HttpResponse.json({ facturas, count: facturas.length, fallidas, truncated: false })) {
  return http.post(`${API}${path}`, async ({ request }) => {
    lastPath = path
    lastBody = await request.json()
    return response()
  })
}

beforeEach(() => {
  lastBody = undefined
  lastPath = undefined
  server.use(scanHandler('/scan'), scanHandler('/scan-sent'))
})

afterEach(() => vi.restoreAllMocks())

async function fillSimple(user, emails = 'facturas@andina.ec') {
  await screen.findByRole('combobox', { name: 'Cuenta de Gmail' })
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Cuenta de Gmail' })).toHaveValue('contabilidad@empresa.com'))
  const date = screen.getByLabelText(/Emisión desde/)
  await user.clear(date)
  await user.type(date, '2026-09-01')
  if (emails) await user.type(screen.getByLabelText(/Correos de/), `${emails}{Enter}`)
}

const scanButton = () => screen.getByRole('button', { name: /^Escanear$|^Espere/ })

describe('Escanear', () => {
  it('starts with an empty state that explains what to do', async () => {
    renderApp('/escanear/recibidas', { session: client })
    expect(await screen.findByText('Elija una cuenta y una fecha para buscar facturas.')).toBeInTheDocument()
  })

  it('validates in the client before calling the API', async () => {
    const user = userEvent.setup()
    renderApp('/escanear/recibidas', { session: client })
    await fillSimple(user, null)
    await user.click(scanButton())
    expect(screen.getByText('Agregue al menos un correo de proveedores o use la lista del servidor.')).toBeInTheDocument()
    expect(lastBody).toBeUndefined()
  })

  it('sends a received scan in simple mode and shows the results', async () => {
    const user = userEvent.setup()
    renderApp('/escanear/recibidas', { session: client })
    await fillSimple(user)
    await user.click(scanButton())

    const table = await screen.findByRole('table', { name: 'Facturas encontradas' })
    expect(lastPath).toBe('/scan')
    expect(lastBody).toEqual({ accountEmail: 'contabilidad@empresa.com', sinceDate: '2026-09-01', supplierEmails: ['facturas@andina.ec'] })
    expect(within(table).getByText('Distribuidora Andina S.A.')).toBeInTheDocument()
    expect(within(table).getByText('XML')).toBeInTheDocument()
    expect(within(table).getByText('PDF · IA')).toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(3)
  })

  it('sends a sent scan in advanced mode with only the query', async () => {
    const user = userEvent.setup()
    renderApp('/escanear/emitidas', { session: client })
    await screen.findByRole('heading', { name: 'Facturas emitidas' })
    await user.click(screen.getByRole('radio', { name: 'Consulta avanzada' }))
    await user.type(screen.getByLabelText(/Consulta de Gmail/), 'in:sent to:cliente@x.com')
    await user.type(screen.getByLabelText('Clave de Gemini'), 'gemini-123')
    await user.click(scanButton())

    await screen.findByRole('table', { name: 'Facturas encontradas' })
    expect(lastPath).toBe('/scan-sent')
    expect(lastBody).toEqual({ accountEmail: 'contabilidad@empresa.com', q: 'in:sent to:cliente@x.com', geminiApiKey: 'gemini-123' })
  })

  it('omits the email list when using the server default', async () => {
    const user = userEvent.setup()
    renderApp('/escanear/emitidas', { session: client })
    await fillSimple(user, null)
    await user.click(screen.getByLabelText(/Usar lista por defecto del servidor/))
    await user.click(scanButton())
    await screen.findByRole('table', { name: 'Facturas encontradas' })
    expect(lastBody).toEqual({ accountEmail: 'contabilidad@empresa.com', sinceDate: '2026-09-01' })
  })

  it('shows the 404 for a disconnected account with a connect action for admins', async () => {
    server.use(
      scanHandler('/scan', () =>
        HttpResponse.json(
          { userMessage: 'La cuenta de Gmail solicitada no está conectada. Conéctela primero mediante /auth/google/login.', technicalError: 'Account not found' },
          { status: 404 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderApp('/escanear/recibidas', { session: admin })
    await fillSimple(user)
    await user.click(scanButton())

    expect(await screen.findByText(/no está conectada/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Conectar esta cuenta' }))
    expect(await screen.findByRole('heading', { name: 'Cuentas de Gmail' })).toBeInTheDocument()
  })

  it('maps a 400 from the API to the field', async () => {
    server.use(
      scanHandler('/scan', () =>
        HttpResponse.json(
          { userMessage: 'Los datos enviados no son válidos.', technicalError: 'Invalid request: sinceDate: must be a valid date' },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderApp('/escanear/recibidas', { session: client })
    await fillSimple(user)
    await user.click(scanButton())
    expect(await screen.findByText('Los datos enviados no son válidos.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Emisión desde/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('disables scanning with a countdown after a 429', async () => {
    server.use(
      scanHandler('/scan', () =>
        HttpResponse.json(
          { userMessage: 'Demasiadas solicitudes de escaneo.', technicalError: 'Rate limit exceeded' },
          { status: 429, headers: { 'Retry-After': '42' } },
        ),
      ),
    )
    const user = userEvent.setup()
    renderApp('/escanear/recibidas', { session: client })
    await fillSimple(user)
    await user.click(scanButton())

    expect(await screen.findByText('Demasiadas solicitudes de escaneo.')).toBeInTheDocument()
    // MSW en Node no aplica CORS. En un navegador real Retry-After solo llega si la API lo incluye
    // en Access-Control-Expose-Headers; si no, se espera el valor por defecto (60 s).
    expect(screen.getByRole('button', { name: /Espere 42 s/ })).toBeDisabled()
    expect(screen.getByText(/Podrá escanear de nuevo en 42 s/)).toBeInTheDocument()
  })

  it('warns when the scan was truncated and lists the failures', async () => {
    server.use(scanHandler('/scan', () => HttpResponse.json({ facturas, count: 2, fallidas, truncated: true })))
    const user = userEvent.setup()
    renderApp('/escanear/recibidas', { session: client })
    await fillSimple(user)
    await user.click(scanButton())

    expect(await screen.findByText('Se alcanzó el límite de 500 correos por escaneo.')).toBeInTheDocument()
    await user.click(screen.getByText('Adjuntos que no se pudieron leer'))
    expect(screen.getByText('roto.zip')).toBeVisible()
    expect(screen.getByText('ZIP file contains no XML or PDF files')).toBeVisible()
  })

  it('filters by origin and search text', async () => {
    const user = userEvent.setup()
    renderApp('/escanear/recibidas', { session: client })
    await fillSimple(user)
    await user.click(scanButton())
    const table = await screen.findByRole('table', { name: 'Facturas encontradas' })

    await user.click(screen.getByRole('radio', { name: 'PDF · IA' }))
    expect(within(table).queryByText('Distribuidora Andina S.A.')).not.toBeInTheDocument()
    expect(screen.getByText('1 de 2 facturas')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Todas' }))
    await user.type(screen.getByRole('searchbox', { name: 'Buscar facturas' }), '1790012345')
    expect(within(table).getByText('Distribuidora Andina S.A.')).toBeInTheDocument()
    expect(within(table).queryByText('Servicios Contables SAC')).not.toBeInTheDocument()
  })

  it('exports the visible rows as CSV', async () => {
    let blob
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => ((blob = b), 'blob:fake'))
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const user = userEvent.setup()
    renderApp('/escanear/recibidas', { session: client })
    await fillSimple(user)
    await user.click(scanButton())
    await screen.findByRole('table', { name: 'Facturas encontradas' })
    await user.click(screen.getByRole('radio', { name: 'XML' }))
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))

    expect(click).toHaveBeenCalled()
    const text = await blob.text()
    const lines = text.replace('﻿', '').trim().split('\r\n')
    expect(lines[0]).toContain('Fecha emisión;Emisor;RUC/RUT')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('Distribuidora Andina S.A.;1790012345001;001-001-000000123;100;15;115;USD;XML')
  })

  it('cancels a running scan and leaves the form usable', async () => {
    server.use(scanHandler('/scan', async () => {
      await delay('infinite')
      return HttpResponse.json({})
    }))
    const user = userEvent.setup()
    renderApp('/escanear/recibidas', { session: client })
    await fillSimple(user)
    await user.click(scanButton())

    expect(await screen.findByText('Buscando correos…')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText('Escaneo cancelado')).toBeInTheDocument()
    expect(screen.queryByText('Buscando correos…')).not.toBeInTheDocument()
    expect(scanButton()).toBeEnabled()
    expect(screen.getByLabelText(/Emisión desde/)).toBeEnabled()
  })

  it('keeps each tab results when switching and asks before replacing them', async () => {
    const user = userEvent.setup()
    renderApp('/escanear/recibidas', { session: client })
    await fillSimple(user)
    await user.click(scanButton())
    await screen.findByRole('table', { name: 'Facturas encontradas' })

    const tabs = within(screen.getByRole('navigation', { name: 'Tipo de escaneo' }))
    await user.click(tabs.getByRole('link', { name: 'Emitidas' }))
    expect(await screen.findByText('Elija una cuenta y una fecha para buscar facturas.')).toBeInTheDocument()

    await user.click(within(screen.getByRole('navigation', { name: 'Tipo de escaneo' })).getByRole('link', { name: 'Recibidas' }))
    expect(await screen.findByRole('table', { name: 'Facturas encontradas' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Emisión desde/)).toHaveValue('2026-09-01')

    lastBody = undefined
    await user.click(scanButton())
    expect(screen.getByRole('dialog', { name: '¿Reemplazar los resultados actuales?' })).toBeInTheDocument()
    expect(lastBody).toBeUndefined()
    await user.click(screen.getByRole('button', { name: 'Escanear de nuevo' }))
    await waitFor(() => expect(lastBody).toBeDefined())
  })
})
