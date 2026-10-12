import { useEffect, useState } from 'react'
import { Button } from '../ui/Button.jsx'

const MESSAGES = ['Buscando correos…', 'Descargando adjuntos…', 'Leyendo facturas…']
const ROTATE_EVERY_S = 8

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Progreso indeterminado de un escaneo (DESIGN.md §4.11): barra, mensaje que rota cada ~8 s,
 * tiempo transcurrido y Cancelar.
 */
export function ScanProgress({ startedAt, onCancel }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const elapsed = Math.max(0, Math.floor((now - (startedAt ?? now)) / 1000))
  const message = MESSAGES[Math.floor(elapsed / ROTATE_EVERY_S) % MESSAGES.length]

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6 shadow-sm">
      <div role="status" aria-live="polite" className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-fg">{message}</p>
          <p className="text-sm text-fg-muted">
            Tiempo transcurrido: <span className="tabular">{formatElapsed(elapsed)}</span>
          </p>
        </div>
        <Button variant="secondary" icon="close" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
        <span
          className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary"
          style={{ animation: 'sf-indeterminate 1.4s var(--sf-ease) infinite' }}
        />
      </div>
      <p className="text-xs text-fg-subtle">
        Un escaneo puede tardar varios minutos si hay muchos correos o PDF que leer. Al cancelar, el servidor
        puede seguir procesando la solicitud.
      </p>
    </div>
  )
}
