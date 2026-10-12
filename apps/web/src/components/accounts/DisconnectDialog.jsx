import { useRef, useState } from 'react'
import { Alert } from '../ui/Alert.jsx'
import { Button } from '../ui/Button.jsx'
import { Dialog } from '../ui/Dialog.jsx'
import { Input } from '../ui/Input.jsx'

/**
 * Confirmación destructiva para desconectar una cuenta (DESIGN.md §4.7): el usuario escribe el
 * correo para habilitar el botón. Montarlo con `key={email}` para reiniciar el campo.
 */
export function DisconnectDialog({ email, open, loading = false, error, onConfirm, onClose }) {
  const [typed, setTyped] = useState('')
  const inputRef = useRef(null)
  const matches = typed.trim().toLowerCase() === (email ?? '').toLowerCase()

  function handleSubmit(event) {
    event.preventDefault()
    if (matches && !loading) onConfirm(email)
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? () => {} : onClose}
      tone="danger"
      initialFocusRef={inputRef}
      title={`¿Desconectar ${email}?`}
      description="El servicio dejará de poder leer esta bandeja hasta que se vuelva a conectar."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" icon="link_off" type="submit" form="disconnect-form" disabled={!matches} loading={loading}>
            Desconectar cuenta
          </Button>
        </>
      }
    >
      <form id="disconnect-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <Alert tone="danger" title={error.userMessage} technicalError={error.technicalError} />}
        <Input
          ref={inputRef}
          label="Escriba el correo para confirmar"
          mono
          autoComplete="off"
          spellCheck={false}
          placeholder={email}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </form>
    </Dialog>
  )
}
