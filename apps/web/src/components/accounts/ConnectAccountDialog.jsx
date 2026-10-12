import { Alert } from '../ui/Alert.jsx'
import { Button } from '../ui/Button.jsx'
import { Dialog } from '../ui/Dialog.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Spinner } from '../ui/Spinner.jsx'

const timeFormatter = new Intl.DateTimeFormat('es', { timeStyle: 'short' })

/**
 * Diálogo de conexión OAuth (DESIGN.md §6.2). Solo presenta el estado que le da useConnectAccount.
 * @param {{
 *   open: boolean,
 *   status: 'idle' | 'starting' | 'waiting' | 'blocked' | 'expired' | 'error' | 'success',
 *   authUrl?: string,
 *   expiresAt?: number,
 *   error?: { userMessage: string, technicalError?: string },
 *   onStart: () => void,
 *   onCancel: () => void,
 * }} props
 */
export function ConnectAccountDialog({ open, status, authUrl, expiresAt, error, onStart, onCancel }) {
  const waiting = status === 'waiting' || status === 'blocked'
  const expiresText = expiresAt ? timeFormatter.format(expiresAt) : null

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Conectar cuenta de Gmail"
      description="El servicio podrá leer los correos de esta bandeja para buscar facturas."
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          {(status === 'idle' || status === 'starting') && (
            <Button variant="admin" icon="open_in_new" loading={status === 'starting'} onClick={onStart}>
              Abrir Google
            </Button>
          )}
          {status === 'expired' && (
            <Button variant="admin" icon="refresh" onClick={onStart}>
              Generar nuevo enlace
            </Button>
          )}
          {status === 'error' && (
            <Button variant="admin" icon="refresh" onClick={onStart}>
              Reintentar
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {(status === 'idle' || status === 'starting') && (
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-md text-fg-muted">
            <li>Se abrirá una ventana de Google para elegir la cuenta.</li>
            <li>Acepte los permisos de lectura de Gmail.</li>
            <li>Cuando vea «Cuenta conectada», cierre esa ventana: esta lista se actualiza sola.</li>
          </ol>
        )}

        {status === 'blocked' && (
          <Alert tone="warning" title="El navegador bloqueó la ventana emergente.">
            <p>Abra el enlace de Google en una pestaña nueva; esta pantalla seguirá esperando.</p>
            <a
              href={authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex h-9 items-center gap-2 rounded-md border border-admin bg-surface px-3.5 font-medium text-admin hover:bg-admin-soft"
            >
              <Icon name="open_in_new" size={18} />
              Abrir Google en una pestaña nueva
            </a>
          </Alert>
        )}

        {waiting && (
          <div role="status" className="flex items-start gap-3 rounded-md border border-border bg-surface-muted p-3">
            <Spinner size={18} className="mt-0.5 text-admin" />
            <div className="text-md">
              <p className="font-semibold text-fg">Esperando autorización en Google…</p>
              <p className="text-fg-muted">
                Complete el consentimiento en la otra ventana.
                {expiresText && ` El enlace caduca a las ${expiresText}.`}
              </p>
              {status === 'waiting' && authUrl && (
                <a href={authUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-primary underline">
                  ¿No se abrió la ventana? Abrir el enlace
                </a>
              )}
            </div>
          </div>
        )}

        {status === 'expired' && (
          <Alert tone="warning" title="El enlace de autorización caducó.">
            Los enlaces de Google duran 10 minutos. Genere uno nuevo para continuar.
          </Alert>
        )}

        {status === 'error' && error && (
          <Alert tone="danger" title={error.userMessage} technicalError={error.technicalError} />
        )}
      </div>
    </Dialog>
  )
}
