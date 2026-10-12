import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { filenameFromContentDisposition, safeFilename } from '../lib/download.js'
import { checkItems } from '../lib/items.js'
import { pdfFilename } from '../lib/pdf.js'
import { API, CLIENT_KEY, server } from './msw/server.js'
import { renderApp } from './renderApp.jsx'

const client = { apiKey: CLIENT_KEY, role: 'client' }
const PDF_BYTES = '%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'

const xmlInvoice = {
  messageId: 'msg-xml', attachmentId: 'att-zip', filename: 'FAC-123.xml',
  claveAcceso: '1509202601179001234500110010010000001231234567811',
  supplierRuc: '1790012345001', supplierName: 'Distribuidora Andina S.A.', numeroFactura: '001-001-000000123',
  fechaEmision: '2026-09-15', subtotal: 100, iva: 15, total: 115, moneda: 'USD', senderEmail: 'facturas@andina.ec',
  items: [
    { nombre: 'Papel bond A4', cantidad: 11, precioUnitario: 5 },
    { nombre: 'Tóner negro', cantidad: 1, precioUnitario: 45, total: 45 },
  ],
}
const pdfInvoice = {
  messageId: 'msg-pdf', attachmentId: 'att-pdf', filename: 'factura servicios.pdf', claveAcceso: 'msg-pdf',
  supplierName: 'Servicios Contables SAC', numeroFactura: 'F001-889', fechaEmision: '2026-09-20',
  subtotal: 200, iva: 36, total: 236, moneda: 'USD', senderEmail: 'cobranzas@contables.pe',
  items: [{ nombre: 'Asesoría contable', cantidad: 1, precioUnitario: 180 }],
}

let downloads
let blobs

function pdfResponse(headers = {}) {
  return new HttpResponse(PDF_BYTES, { headers: { 'Content-Type': 'application/pdf', ...headers } })
}

beforeEach(() => {
  downloads = []
  blobs = []
  server.use(
    http.post(`${API}/scan`, () => HttpResponse.json({ facturas: [xmlInvoice, pdfInvoice], count: 2, fallidas: [], truncated: false })),
    http.get(`${API}/download-pdf`, ({ request }) => {
      downloads.push(Object.fromEntries(new URL(request.url).searchParams))
      return pdfResponse({ 'Content-Disposition': 'attachment; filename="FAC-123.pdf"' })
    }),
  )
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => (blobs.push(b), `blob:fake-${blobs.length}`))
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => vi.restoreAllMocks())

async function scanAndOpen(user, rowText) {
  renderApp('/escanear/recibidas', { session: client })
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Cuenta de Gmail' })).toHaveValue('contabilidad@empresa.com'))
  await user.click(screen.getByLabelText(/Usar lista por defecto del servidor/))
  await user.click(screen.getByRole('button', { name: 'Escanear' }))
  const table = await screen.findByRole('table', { name: 'Facturas encontradas' })
  if (rowText) await user.click(within(table).getByText(rowText))
  return table
}

const drawer = () => screen.getByRole('dialog')

describe('Detalle de factura', () => {
  it('opens from the row with issuer, document, email and a copyable access key', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await scanAndOpen(user, 'Distribuidora Andina S.A.')

    const d = within(drawer())
    expect(d.getByRole('heading', { name: 'Distribuidora Andina S.A.' })).toBeInTheDocument()
    expect(d.getByText('1790012345001')).toBeInTheDocument()
    expect(d.getByText('facturas@andina.ec')).toBeInTheDocument()
    await user.click(d.getByRole('button', { name: 'Copiar clave de acceso' }))
    expect(writeText).toHaveBeenCalledWith(xmlInvoice.claveAcceso)
    expect(await d.findByRole('button', { name: 'Copiado' })).toBeInTheDocument()
  })

  it('also opens with the "Ver detalle" button and closes with Escape', async () => {
    const user = userEvent.setup()
    await scanAndOpen(user)
    await user.click(screen.getByRole('button', { name: 'Ver detalle de F001-889' }))
    expect(within(drawer()).getByRole('heading', { name: 'Servicios Contables SAC' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('hides the access key when the API filled it with the messageId', async () => {
    const user = userEvent.setup()
    await scanAndOpen(user, 'Servicios Contables SAC')
    expect(within(drawer()).queryByRole('button', { name: 'Copiar clave de acceso' })).not.toBeInTheDocument()
  })

  it('sums the items and accepts them when they match the subtotal', async () => {
    const user = userEvent.setup()
    await scanAndOpen(user, 'Distribuidora Andina S.A.')
    const items = within(within(drawer()).getByRole('table', { name: 'Ítems de la factura' }))
    expect(items.getByText('Papel bond A4')).toBeInTheDocument()
    expect(items.getByRole('row', { name: /Suma de ítems/ })).toHaveTextContent('100,00')
    expect(screen.queryByText('Los ítems no cuadran con el subtotal.')).not.toBeInTheDocument()
  })

  it('warns when the items do not add up to the subtotal', async () => {
    const user = userEvent.setup()
    await scanAndOpen(user, 'Servicios Contables SAC')
    expect(within(drawer()).getByText('Los ítems no cuadran con el subtotal.')).toBeInTheDocument()
    expect(within(drawer()).getByText('-20,00')).toBeInTheDocument()
  })
})

describe('PDF', () => {
  it('loads the preview on demand and reuses it for the download', async () => {
    const user = userEvent.setup()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await scanAndOpen(user, 'Distribuidora Andina S.A.')
    expect(downloads).toHaveLength(0)

    await user.click(within(drawer()).getByRole('button', { name: 'Mostrar vista previa' }))
    expect(await within(drawer()).findByTitle('Vista previa del PDF')).toBeInTheDocument()
    expect(downloads).toHaveLength(1)
    expect(blobs[0].type).toBe('application/pdf')

    await user.click(within(drawer()).getByRole('button', { name: 'Descargar PDF' }))
    expect(await screen.findByText('PDF descargado')).toBeInTheDocument()
    expect(downloads).toHaveLength(1)
  })

  it('downloads through the API with the scan account and the Content-Disposition name', async () => {
    const user = userEvent.setup()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      click.lastDownload = this.download
    })
    await scanAndOpen(user)
    await user.click(screen.getByRole('button', { name: 'Descargar PDF de 001-001-000000123' }))

    expect(await screen.findByText('PDF descargado')).toBeInTheDocument()
    // Factura leída de un XML: no se envía filename para que la API busque el PDF del correo.
    expect(downloads[0]).toEqual({ accountEmail: 'contabilidad@empresa.com', messageId: 'msg-xml', attachmentId: 'att-zip' })
    expect(click.lastDownload).toBe('FAC-123.pdf')
  })

  it('sends the PDF filename so the API can pick it inside a ZIP', async () => {
    server.use(
      http.get(`${API}/download-pdf`, ({ request }) => {
        downloads.push(Object.fromEntries(new URL(request.url).searchParams))
        return pdfResponse()
      }),
    )
    const user = userEvent.setup()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      click.lastDownload = this.download
    })
    await scanAndOpen(user)
    await user.click(screen.getByRole('button', { name: 'Descargar PDF de F001-889' }))

    expect(await screen.findByText('PDF descargado')).toBeInTheDocument()
    expect(downloads[0]).toMatchObject({ messageId: 'msg-pdf', filename: 'factura servicios.pdf' })
    // Sin Content-Disposition se usa el nombre del adjunto.
    expect(click.lastDownload).toBe('factura servicios.pdf')
  })

  it('shows the API userMessage in a toast when the download fails', async () => {
    server.use(
      http.get(`${API}/download-pdf`, () =>
        HttpResponse.json(
          { userMessage: 'Ocurrió un error al intentar descargar el archivo PDF.', technicalError: 'No PDF or ZIP attachment found in message msg-xml' },
          { status: 500 },
        ),
      ),
    )
    const user = userEvent.setup()
    await scanAndOpen(user)
    await user.click(screen.getByRole('button', { name: 'Descargar PDF de 001-001-000000123' }))
    expect(await screen.findByText('Ocurrió un error al intentar descargar el archivo PDF.')).toBeInTheDocument()
    expect(screen.getByText('No PDF or ZIP attachment found in message msg-xml')).toBeInTheDocument()
  })

  it('refuses to preview content that is not a PDF', async () => {
    server.use(
      http.get(`${API}/download-pdf`, () => new HttpResponse('<script>alert(1)</script>', { headers: { 'Content-Type': 'text/html' } })),
    )
    const user = userEvent.setup()
    await scanAndOpen(user, 'Distribuidora Andina S.A.')
    await user.click(within(drawer()).getByRole('button', { name: 'Mostrar vista previa' }))
    expect(await within(drawer()).findByText('El adjunto no es un PDF válido.')).toBeInTheDocument()
    expect(within(drawer()).queryByTitle('Vista previa del PDF')).not.toBeInTheDocument()
    expect(blobs).toHaveLength(0)
  })
})

describe('utilidades de PDF e ítems', () => {
  it('reads filenames from Content-Disposition', () => {
    expect(filenameFromContentDisposition('attachment; filename="FAC 1.pdf"')).toBe('FAC 1.pdf')
    expect(filenameFromContentDisposition("attachment; filename*=UTF-8''Factura%20%C3%91.pdf")).toBe('Factura Ñ.pdf')
    expect(filenameFromContentDisposition('attachment; filename=plain.pdf')).toBe('plain.pdf')
    expect(filenameFromContentDisposition(null)).toBeNull()
  })

  it('sanitizes names and derives one when the attachment is not a PDF', () => {
    expect(safeFilename('../../etc/pass?wd.pdf')).toBe('pass_wd.pdf')
    expect(pdfFilename({ filename: 'FAC.xml', numeroFactura: '001-001-9' }, null)).toBe('001-001-9.pdf')
    expect(pdfFilename({ filename: 'FAC.xml' }, null)).toBe('FAC.pdf')
  })

  it('compares the item sum with the subtotal', () => {
    expect(checkItems([{ cantidad: 2, precioUnitario: 1.005 }], 2.01)).toMatchObject({ matches: true })
    expect(checkItems([{ cantidad: 1, precioUnitario: 10 }], 12)).toEqual({ sum: 10, difference: -2, matches: false })
    expect(checkItems([], 12)).toMatchObject({ matches: null })
  })
})
