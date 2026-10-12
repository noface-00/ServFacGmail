import { filenameFromContentDisposition, safeFilename } from './download.js'

/** Clave de caché del PDF de una factura: cuenta + mensaje + adjunto + archivo (admite `null`). */
export function pdfKey(accountEmail, invoice) {
  return ['pdf', accountEmail, invoice?.messageId ?? null, invoice?.attachmentId ?? null, invoice?.filename ?? null]
}

/**
 * Nombre para guardar el PDF: el de Content-Disposition si llegó; si no, el del adjunto cuando ya
 * es un .pdf; si no, uno derivado del número de factura o del mensaje.
 */
export function pdfFilename(invoice, contentDisposition) {
  const fromHeader = filenameFromContentDisposition(contentDisposition)
  if (fromHeader) return safeFilename(fromHeader)
  if (invoice.filename?.toLowerCase().endsWith('.pdf')) return safeFilename(invoice.filename)
  const base = invoice.numeroFactura ?? invoice.filename?.replace(/\.[^.]+$/, '') ?? invoice.messageId ?? 'factura'
  return safeFilename(`${base}.pdf`)
}
