/** Descarga un Blob con el nombre indicado (object URL + <a download>). */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Nombre de archivo de una cabecera Content-Disposition (`filename*=UTF-8''…` o `filename="…"`).
 * Solo llega al navegador si la API la expone por CORS (Access-Control-Expose-Headers).
 */
export function filenameFromContentDisposition(header) {
  if (!header) return null
  const encoded = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(header)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ''))
    } catch {
      // Codificación inválida: se intenta con filename=.
    }
  }
  const plain = /filename\s*=\s*"([^"]*)"|filename\s*=\s*([^;]+)/i.exec(header)
  const name = plain?.[1] ?? plain?.[2]?.trim()
  return name || null
}

/** Quita rutas y caracteres no válidos en nombres de archivo. */
export function safeFilename(name) {
  // Los caracteres de control vienen del nombre del adjunto (lo elige quien envía el correo).
  // eslint-disable-next-line no-control-regex
  return name.split(/[\\/]/).pop().replace(/[<>:"|?*\u0000-\u001f]/g, '_').trim() || 'factura.pdf'
}

/** true si el contenido empieza por la firma de un PDF (%PDF). */
export async function isPdfBlob(blob) {
  const head = await blob.slice(0, 5).arrayBuffer()
  return new TextDecoder().decode(head).startsWith('%PDF')
}
