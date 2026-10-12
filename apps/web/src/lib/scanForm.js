// Formulario de escaneo: valores por defecto, validación en cliente (espejo de
// apps/api/src/validation.ts y de las comprobaciones del controlador) y armado del cuerpo.

import { EMAIL_LIST_MAX, QUERY_MAX_LENGTH, isValidEmail } from './validation.js'

export const GEMINI_KEY_MAX_LENGTH = 256

/** Campo de correos según el tipo de escaneo. */
export const emailsField = (kind) => (kind === 'sent' ? 'clientEmails' : 'supplierEmails')

function daysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function defaultScanForm() {
  return { mode: 'simple', sinceDate: daysAgo(30), emails: [], useDefaultList: false, q: '', geminiApiKey: '' }
}

/**
 * @returns {Record<string, string>} errores por campo (vacío si es válido). Claves: accountEmail,
 *   sinceDate, emails, q, geminiApiKey.
 */
export function validateScanForm(values, { accountEmail, kind }) {
  const errors = {}
  if (!accountEmail) errors.accountEmail = 'Elija una cuenta de Gmail.'

  if (values.mode === 'advanced') {
    if (!values.q.trim()) errors.q = 'Escriba la consulta de Gmail.'
    else if (values.q.length > QUERY_MAX_LENGTH) errors.q = `La consulta admite como máximo ${QUERY_MAX_LENGTH} caracteres.`
  } else {
    if (!values.sinceDate) errors.sinceDate = 'Indique desde qué fecha buscar.'
    else if (Number.isNaN(Date.parse(values.sinceDate))) errors.sinceDate = 'La fecha no es válida.'

    if (!values.useDefaultList) {
      const label = kind === 'sent' ? 'clientes' : 'proveedores'
      if (values.emails.length === 0) errors.emails = `Agregue al menos un correo de ${label} o use la lista del servidor.`
      else if (values.emails.length > EMAIL_LIST_MAX) errors.emails = `Como máximo ${EMAIL_LIST_MAX} correos.`
      else if (values.emails.some((e) => !isValidEmail(e))) errors.emails = 'Quite o corrija los correos no válidos.'
    }
  }

  if (values.geminiApiKey.length > GEMINI_KEY_MAX_LENGTH) errors.geminiApiKey = 'La clave es demasiado larga.'
  return errors
}

/**
 * Cuerpo para POST /scan o /scan-sent. En modo avanzado solo va `q` (la API ignora fecha y
 * correos). Con "Usar lista por defecto del servidor" se omite el campo de correos.
 */
export function buildScanPayload(values, { accountEmail, kind }) {
  const payload = { accountEmail }
  if (values.mode === 'advanced') {
    payload.q = values.q.trim()
  } else {
    payload.sinceDate = values.sinceDate
    if (!values.useDefaultList) payload[emailsField(kind)] = values.emails
  }
  if (values.geminiApiKey.trim()) payload.geminiApiKey = values.geminiApiKey.trim()
  return payload
}

const FIELD_ALIASES = {
  accountEmail: 'accountEmail',
  sinceDate: 'sinceDate',
  q: 'q',
  geminiApiKey: 'geminiApiKey',
  supplierEmails: 'emails',
  clientEmails: 'emails',
}

const FIELD_MESSAGES = {
  accountEmail: 'La cuenta no es válida.',
  sinceDate: 'La fecha no es válida.',
  q: 'La consulta no es válida.',
  geminiApiKey: 'La clave de Gemini no es válida.',
  emails: 'Hay correos no válidos en la lista.',
}

/**
 * Asocia un 400 de la API a los campos del formulario (DESIGN.md §6.1). Entiende el formato de
 * validation.ts ("Invalid request: supplierEmails.0: must be a valid email; sinceDate: …") y los
 * mensajes del controlador ("Missing required parameter: sinceDate …").
 */
export function mapApiFieldErrors(technicalError = '') {
  const errors = {}
  if (technicalError.startsWith('Invalid request:')) {
    for (const part of technicalError.slice('Invalid request:'.length).split(';')) {
      const field = FIELD_ALIASES[part.trim().split(/[.:]/)[0]]
      if (field) errors[field] = FIELD_MESSAGES[field]
    }
    return errors
  }
  for (const [apiField, field] of Object.entries(FIELD_ALIASES)) {
    if (new RegExp(`\\b${apiField}\\b`).test(technicalError)) errors[field] = FIELD_MESSAGES[field]
  }
  return errors
}
