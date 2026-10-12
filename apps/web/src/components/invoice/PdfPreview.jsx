import { useEffect, useRef } from 'react'
import { Alert } from '../ui/Alert.jsx'
import { Button } from '../ui/Button.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'

/**
 * Vista previa del PDF. Se carga a petición (`onLoad`) porque cada descarga cuenta para el límite
 * de escaneos de la API. El object URL se crea y revoca junto al iframe.
 * @param {{ blob?: Blob, loading?: boolean, error?: { userMessage: string, technicalError?: string } | null, onLoad: () => void }} props
 */
export function PdfPreview({ blob, loading = false, error = null, onLoad }) {
  if (error) return <Alert tone="danger" title={error.userMessage} technicalError={error.technicalError} />
  if (loading) return <Skeleton className="h-[420px] w-full rounded-md" />
  if (!blob) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-sm border border-dashed border-border-strong p-3">
        <p className="text-sm text-fg-muted">Muestre el PDF del correo sin descargarlo.</p>
        <Button variant="secondary" size="sm" icon="visibility" onClick={onLoad}>
          Mostrar vista previa
        </Button>
      </div>
    )
  }
  return <PdfFrame blob={blob} />
}

function PdfFrame({ blob }) {
  const frameRef = useRef(null)

  useEffect(() => {
    const url = URL.createObjectURL(blob)
    if (frameRef.current) frameRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [blob])

  return <iframe ref={frameRef} title="Vista previa del PDF" className="h-[520px] w-full rounded-md border border-border bg-surface-muted" />
}
