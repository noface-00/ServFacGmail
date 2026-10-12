import { useId } from 'react'
import { QUERY_MAX_LENGTH } from '../../lib/validation.js'
import { DateInput } from '../form/DateInput.jsx'
import { EmailChipsInput } from '../form/EmailChipsInput.jsx'
import { SegmentedControl } from '../form/SegmentedControl.jsx'
import { TextareaCounter } from '../form/TextareaCounter.jsx'
import { Button } from '../ui/Button.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Input } from '../ui/Input.jsx'
import { Select } from '../ui/Select.jsx'

const MODES = [
  { value: 'simple', label: 'Simple' },
  { value: 'advanced', label: 'Consulta avanzada' },
]

const COPY = {
  received: {
    emailsLabel: 'Correos de proveedores',
    emailsHint: 'Se buscan los correos recibidos de estas direcciones.',
    defaultList: 'Usar lista por defecto del servidor (SUPPLIER_EMAILS)',
    queryHint: 'Sintaxis de Gmail, p. ej.: from:facturas@proveedor.com has:attachment after:2026/09/01',
  },
  sent: {
    emailsLabel: 'Correos de clientes',
    emailsHint: 'Se buscan los correos enviados a estas direcciones.',
    defaultList: 'Usar lista por defecto del servidor (CLIENT_EMAILS)',
    queryHint: 'Sintaxis de Gmail, p. ej.: in:sent to:cliente@empresa.com has:attachment after:2026/09/01',
  },
}

/**
 * Formulario de escaneo (DESIGN.md §5.3). Componente controlado: los valores y errores vienen
 * por props y cada cambio se notifica con `onChange(patch)`.
 */
export function ScanForm({
  kind,
  values,
  errors = {},
  accounts,
  accountEmail,
  onAccountChange,
  onChange,
  onSubmit,
  disabled = false,
  submitLabel = 'Escanear',
  submitDisabled = false,
  footer,
}) {
  const copy = COPY[kind]
  const optionsId = useId()

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon name="tune" size={20} className="text-primary" />
        <h2 className="text-lg font-semibold text-fg">Criterios de búsqueda</h2>
      </div>

      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
        <Select
          label="Cuenta de Gmail"
          icon="alternate_email"
          mono
          required
          placeholder={accounts.length === 0 ? 'No hay cuentas conectadas' : undefined}
          value={accountEmail ?? ''}
          onChange={(e) => onAccountChange(e.target.value)}
          options={accounts.map((a) => ({ value: a.email, label: a.email }))}
          error={errors.accountEmail}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg">Modo de consulta</span>
          <SegmentedControl label="Modo de consulta" options={MODES} value={values.mode} onChange={(mode) => onChange({ mode })} disabled={disabled} />
        </div>

        {values.mode === 'simple' ? (
          <>
            <DateInput
              label="Emisión desde"
              required
              value={values.sinceDate}
              onChange={(e) => onChange({ sinceDate: e.target.value })}
              error={errors.sinceDate}
            />
            <EmailChipsInput
              label={copy.emailsLabel}
              hint={copy.emailsHint}
              value={values.emails}
              onChange={(emails) => onChange({ emails })}
              disabled={disabled || values.useDefaultList}
              error={values.useDefaultList ? undefined : errors.emails}
            />
            <label className="-mt-2 flex cursor-pointer items-start gap-2 text-sm text-fg-muted select-none">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[var(--sf-primary)]"
                checked={values.useDefaultList}
                onChange={(e) => onChange({ useDefaultList: e.target.checked })}
              />
              <span>{copy.defaultList}</span>
            </label>
          </>
        ) : (
          <TextareaCounter
            label="Consulta de Gmail"
            mono
            required
            rows={4}
            maxLength={QUERY_MAX_LENGTH}
            value={values.q}
            onChange={(e) => onChange({ q: e.target.value })}
            error={errors.q}
            hint={`${copy.queryHint}. Con una consulta se ignoran la fecha y la lista de correos.`}
          />
        )}

        <details className="group rounded-sm border border-border bg-surface-muted/50">
          <summary
            aria-controls={optionsId}
            className="flex cursor-pointer items-center justify-between px-3 py-2 text-md font-medium text-fg-muted select-none hover:text-fg"
          >
            <span className="flex items-center gap-2">
              <Icon name="settings" size={18} />
              Opciones
            </span>
            <Icon name="expand_more" size={18} className="transition-transform group-open:rotate-180" />
          </summary>
          <div id={optionsId} className="px-3 pb-3">
            <Input
              label="Clave de Gemini"
              type="password"
              mono
              autoComplete="off"
              value={values.geminiApiKey}
              onChange={(e) => onChange({ geminiApiKey: e.target.value })}
              error={errors.geminiApiKey}
              hint="Opcional. Si se omite se usa la del servidor. Solo se usa para leer PDF sin XML."
            />
          </div>
        </details>
      </fieldset>

      <Button type="submit" size="lg" icon="document_scanner" loading={disabled} disabled={submitDisabled} className="w-full">
        {submitLabel}
      </Button>
      {footer}
    </form>
  )
}
