// Reglas que espejan apps/api/src/validation.ts (DESIGN.md §4.2).

export const EMAIL_MAX_LENGTH = 254
export const EMAIL_LIST_MAX = 200
export const QUERY_MAX_LENGTH = 1000
export const KEY_NAME_MAX_LENGTH = 100

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** true si `value` es un correo con formato válido y dentro del largo permitido. */
export function isValidEmail(value) {
  return typeof value === 'string' && value.length <= EMAIL_MAX_LENGTH && EMAIL_RE.test(value)
}
