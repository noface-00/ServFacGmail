import api from '../axios.js'

/** Un escaneo pagina Gmail y puede llamar a Gemini por cada PDF: el timeout global (15 s) no sirve. */
export const SCAN_TIMEOUT_MS = 10 * 60 * 1000

/**
 * @typedef {{ nombre: string, cantidad: number, precioUnitario: number, total?: number }} InvoiceItem
 * @typedef {{
 *   messageId?: string, attachmentId?: string, filename?: string, claveAcceso?: string,
 *   supplierRuc?: string, supplierName?: string, numeroFactura?: string, fechaEmision?: string,
 *   subtotal?: number, iva?: number, total?: number, moneda?: string, items?: InvoiceItem[],
 *   senderEmail?: string, recipientEmail?: string,
 * }} Invoice
 * @typedef {{ messageId: string, filename?: string, error: string }} FailedInvoice
 * @typedef {{ facturas: Invoice[], count: number, fallidas: FailedInvoice[], truncated: boolean }} ScanResult
 */

/**
 * POST /scan (recibidas, `supplierEmails`) o POST /scan-sent (emitidas, `clientEmails`).
 * @param {'received' | 'sent'} kind
 * @param {object} payload cuerpo ya armado por lib/scanForm.js
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<ScanResult>}
 */
export async function runScan(kind, payload, { signal } = {}) {
  const path = kind === 'sent' ? '/scan-sent' : '/scan'
  const { data } = await api.post(path, payload, { timeout: SCAN_TIMEOUT_MS, signal })
  return data
}

export const DOWNLOAD_TIMEOUT_MS = 2 * 60 * 1000

/**
 * GET /download-pdf → el PDF del correo (si el adjunto es un ZIP, la API extrae el PDF de dentro;
 * si es un XML, busca el PDF del mismo correo). `filename` solo se envía cuando es un .pdf: la
 * API lo usa para elegir la entrada dentro del ZIP y con un .xml no encontraría ningún PDF.
 * @returns {Promise<{ blob: Blob, contentDisposition: string | null }>}
 */
export async function downloadPdf({ accountEmail, messageId, attachmentId, filename }) {
  const params = { accountEmail, messageId, attachmentId }
  if (filename?.toLowerCase().endsWith('.pdf')) params.filename = filename
  const response = await api.get('/download-pdf', { params, responseType: 'blob', timeout: DOWNLOAD_TIMEOUT_MS })
  return { blob: response.data, contentDisposition: response.headers?.['content-disposition'] ?? null }
}
