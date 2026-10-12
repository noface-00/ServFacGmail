// Utilidades sobre las facturas que devuelve /scan y /scan-sent (objetos planos de
// ParsedInvoiceData, ver api/routes/scan.js).

/**
 * Origen de los datos según la extensión del archivo: XML (parseo local, exacto) o PDF leído por
 * IA (Gemini, revisar). La API no informa si el archivo venía dentro de un ZIP.
 * @returns {'xml' | 'pdfAi' | 'unknown'}
 */
export function invoiceOrigin(invoice) {
  const name = (invoice.filename ?? '').toLowerCase()
  if (name.endsWith('.xml')) return 'xml'
  if (name.endsWith('.pdf')) return 'pdfAi'
  return 'unknown'
}

/** Clave estable de fila: un mismo adjunto ZIP puede producir varias facturas. */
export function invoiceKey(invoice, index) {
  return [invoice.messageId, invoice.attachmentId, invoice.filename, invoice.numeroFactura].filter(Boolean).join('|') || `row-${index}`
}

/**
 * Totales agrupados por moneda (`null` = moneda desconocida), primero la moneda con más facturas:
 * comparar importes de monedas distintas (CLP frente a USD) no tiene sentido.
 */
export function totalsByCurrency(invoices) {
  const totals = new Map()
  for (const inv of invoices) {
    const amount = Number(inv.total)
    if (inv.total === undefined || inv.total === null || Number.isNaN(amount)) continue
    const key = inv.moneda || null
    const entry = totals.get(key) ?? { currency: key, total: 0, count: 0 }
    entry.total += amount
    entry.count += 1
    totals.set(key, entry)
  }
  return [...totals.values()].sort((a, b) => b.count - a.count || b.total - a.total)
}

/** Correo relevante de la factura: remitente (recibidas) o destinatario (emitidas). */
export function invoiceEmail(invoice, kind) {
  return kind === 'sent' ? invoice.recipientEmail : invoice.senderEmail
}

/** Búsqueda de texto libre sobre emisor, RUC, número, correo y archivo. */
export function matchesSearch(invoice, term, kind) {
  const needle = term.trim().toLowerCase()
  if (!needle) return true
  return [invoice.supplierName, invoice.supplierRuc, invoice.numeroFactura, invoiceEmail(invoice, kind), invoice.filename, invoice.claveAcceso]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(needle))
}
