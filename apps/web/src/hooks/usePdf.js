import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { downloadPdf } from '../api/routes/scan.js'
import { downloadBlob, isPdfBlob } from '../lib/download.js'
import { invoiceKey } from '../lib/invoices.js'
import { pdfFilename, pdfKey } from '../lib/pdf.js'
import { useToast } from './useToast.js'

export const NOT_A_PDF_MESSAGE = 'El adjunto no es un PDF válido.'

/**
 * Descarga y valida el PDF. El tipo del blob se fuerza a application/pdf y se exige la firma
 * %PDF: el Content-Type que devuelve la API viene del correo y no es de fiar (un text/html
 * abierto como blob se ejecutaría con el origen del panel).
 */
async function fetchPdf(accountEmail, invoice) {
  const { blob, contentDisposition } = await downloadPdf({ accountEmail, ...invoice })
  if (!(await isPdfBlob(blob))) {
    const error = new Error(NOT_A_PDF_MESSAGE)
    error.userMessage = NOT_A_PDF_MESSAGE
    error.technicalError = `Unexpected content type: ${blob.type || 'unknown'}`
    throw error
  }
  return { blob: new Blob([blob], { type: 'application/pdf' }), filename: pdfFilename(invoice, contentDisposition) }
}

const pdfQuery = (accountEmail, invoice) => ({
  queryKey: pdfKey(accountEmail, invoice),
  queryFn: () => fetchPdf(accountEmail, invoice),
  // El adjunto no cambia: se reutiliza para la vista previa y la descarga sin pedirlo otra vez.
  staleTime: Infinity,
  gcTime: 5 * 60 * 1000,
  retry: false,
})

/** PDF para la vista previa; solo se pide cuando `enabled` (cuenta para el límite de escaneos). */
export function usePdfPreview(accountEmail, invoice, enabled) {
  return useQuery({ ...pdfQuery(accountEmail, invoice), enabled: Boolean(enabled && invoice) })
}

/**
 * Descarga de PDF con estado por factura (DESIGN.md §6.4): `download(invoice)` y
 * `isDownloading(invoice)`. Éxito y error se avisan con toast (no bloquean la vista).
 */
export function useDownloadPdf(accountEmail) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [pending, setPending] = useState(() => new Set())

  const download = useCallback(
    async (invoice) => {
      const key = invoiceKey(invoice)
      setPending((s) => new Set(s).add(key))
      try {
        const { blob, filename } = await queryClient.fetchQuery(pdfQuery(accountEmail, invoice))
        downloadBlob(blob, filename)
        toast.show({ tone: 'success', title: 'PDF descargado', description: filename })
      } catch (error) {
        toast.show({ tone: 'danger', title: error.userMessage ?? 'No se pudo descargar el PDF.', description: error.technicalError })
      } finally {
        setPending((s) => {
          const next = new Set(s)
          next.delete(key)
          return next
        })
      }
    },
    [accountEmail, queryClient, toast],
  )

  const isDownloading = useCallback((invoice) => pending.has(invoiceKey(invoice)), [pending])

  return { download, isDownloading }
}
