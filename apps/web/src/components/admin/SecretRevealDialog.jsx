import { useRef, useState } from 'react'
import { Alert } from '../ui/Alert.jsx'
import { Button } from '../ui/Button.jsx'
import { Dialog } from '../ui/Dialog.jsx'

/**
 * Revelado único de la clave recién creada (DESIGN.md §6.3). No se cierra con Esc, clic fuera ni
 * ✕; «Listo» se habilita tras copiar o marcar «Ya la guardé». La clave solo vive en las props.
 * @param {{ secret: string | null, name?: string, message?: string, onDone: () => void }} props
 */
export function SecretRevealDialog({ secret, name, message, onDone }) {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const copyRef = useRef(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setCopyFailed(false)
    } catch {
      setCopyFailed(true)
    }
  }

  return (
    <Dialog
      open={Boolean(secret)}
      onClose={onDone}
      dismissible={false}
      initialFocusRef={copyRef}
      title="Clave creada"
      description={name ? `Clave para «${name}».` : undefined}
      footer={
        <Button variant="admin" icon="check" disabled={!copied && !saved} onClick={onDone}>
          Listo
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Alert tone="warning" title={message ?? 'Guárdela ahora: no se volverá a mostrar.'} />
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted p-3">
          <code aria-label="Clave de API" className="tabular block text-md break-all text-fg select-all">
            {secret}
          </code>
          <Button ref={copyRef} variant="secondary" size="sm" icon={copied ? 'check' : 'content_copy'} onClick={copy} className="self-start">
            {copied ? 'Copiada' : 'Copiar clave'}
          </Button>
          {copyFailed && <p className="text-xs text-danger">No se pudo copiar. Selecciónela y cópiela a mano.</p>}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-md text-fg select-none">
          <input type="checkbox" className="h-4 w-4 accent-[var(--sf-admin)]" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          Ya la guardé en un lugar seguro
        </label>
      </div>
    </Dialog>
  )
}
