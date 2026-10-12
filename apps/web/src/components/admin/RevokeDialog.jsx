import { Alert } from '../ui/Alert.jsx'
import { Button } from '../ui/Button.jsx'
import { Dialog } from '../ui/Dialog.jsx'

/**
 * Confirmación destructiva para revocar una clave (DESIGN.md §4.7 y §8).
 * @param {{ apiKey: { id: string, name: string, keyPrefix: string } | null, loading?: boolean, error?: any, onConfirm: (id: string) => void, onClose: () => void }} props
 */
export function RevokeDialog({ apiKey, loading = false, error, onConfirm, onClose }) {
  return (
    <Dialog
      open={Boolean(apiKey)}
      onClose={loading ? () => {} : onClose}
      tone="danger"
      size="sm"
      title={`¿Revocar la clave «${apiKey?.name ?? ''}»?`}
      description="Los sistemas que la usen dejarán de tener acceso de inmediato. No se puede deshacer."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" icon="block" loading={loading} onClick={() => onConfirm(apiKey.id)}>
            Revocar clave
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {apiKey && <p className="tabular text-sm text-fg-muted">Prefijo: {apiKey.keyPrefix}…</p>}
        {error && <Alert tone="danger" title={error.userMessage} technicalError={error.technicalError} />}
      </div>
    </Dialog>
  )
}
