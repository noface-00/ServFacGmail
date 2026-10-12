import { useState } from 'react'
import { EMAIL_LIST_MAX, KEY_NAME_MAX_LENGTH, isValidEmail } from '../../lib/validation.js'
import { EmailChipsInput } from '../form/EmailChipsInput.jsx'
import { Alert } from '../ui/Alert.jsx'
import { Button } from '../ui/Button.jsx'
import { Dialog } from '../ui/Dialog.jsx'
import { Input } from '../ui/Input.jsx'

function validate(name, accounts) {
  const errors = {}
  const trimmed = name.trim()
  if (!trimmed) errors.name = 'Escriba un nombre para la clave.'
  else if (trimmed.length > KEY_NAME_MAX_LENGTH) errors.name = `Como máximo ${KEY_NAME_MAX_LENGTH} caracteres.`
  if (accounts.length > EMAIL_LIST_MAX) errors.allowedAccounts = `Como máximo ${EMAIL_LIST_MAX} cuentas.`
  else if (accounts.some((e) => !isValidEmail(e))) errors.allowedAccounts = 'Quite o corrija los correos no válidos.'
  return errors
}

function withoutKey(object, key) {
  return Object.fromEntries(Object.entries(object).filter(([k]) => k !== key))
}

/** Campos señalados por un 400 de validation.ts ("Invalid request: name: …; allowedAccounts.0: …"). */
function apiFieldErrors(error) {
  if (error?.status !== 400) return {}
  const text = error.technicalError ?? ''
  const errors = {}
  if (/\bname\b/.test(text)) errors.name = 'El nombre no es válido.'
  if (/\ballowedAccounts\b/.test(text)) errors.allowedAccounts = 'Hay correos no válidos en la lista.'
  return errors
}

/**
 * Crear clave de API (DESIGN.md §5.5): nombre (1–100) y cuentas permitidas. Montar con una `key`
 * nueva en cada apertura para empezar con el formulario vacío.
 * @param {{ open: boolean, onClose: () => void, onSubmit: (input: { name: string, allowedAccounts: string[] }) => void, loading?: boolean, error?: any, suggestions?: string[] }} props
 */
export function CreateKeyDialog({ open, onClose, onSubmit, loading = false, error, suggestions = [] }) {
  const [name, setName] = useState('')
  const [accounts, setAccounts] = useState([])
  const [errors, setErrors] = useState({})
  const shown = { ...apiFieldErrors(error), ...errors }

  function handleSubmit(event) {
    event.preventDefault()
    const found = validate(name, accounts)
    setErrors(found)
    if (Object.keys(found).length === 0) onSubmit({ name: name.trim(), allowedAccounts: accounts })
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? () => {} : onClose}
      title="Crear clave de API"
      description="Cree una clave por cada sistema que vaya a consultar el servicio."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="admin" icon="key" type="submit" form="create-key-form" loading={loading}>
            Crear clave
          </Button>
        </>
      }
    >
      <form id="create-key-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error && <Alert tone="danger" title={error.userMessage} technicalError={error.technicalError} />}
        <Input
          label="Nombre"
          required
          maxLength={KEY_NAME_MAX_LENGTH}
          placeholder="p. ej. ERP contable"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setErrors((e) => withoutKey(e, 'name'))
          }}
          error={shown.name}
          hint="Para reconocer qué sistema usa la clave."
        />
        <EmailChipsInput
          label="Cuentas permitidas"
          value={accounts}
          onChange={(next) => {
            setAccounts(next)
            setErrors((e) => withoutKey(e, 'allowedAccounts'))
          }}
          suggestions={suggestions}
          suggestionsLabel="Cuentas conectadas"
          placeholder="Vacío = todas las cuentas"
          error={shown.allowedAccounts}
          hint="Déjelo vacío para dar acceso a todas las cuentas de Gmail conectadas."
        />
      </form>
    </Dialog>
  )
}
