/**
 * Tono de Alert para un ApiError según DESIGN.md §6.1: 404 informativo, 429 advertencia y el
 * resto (400, 403, 500, red) error.
 */
export function errorTone(error) {
  if (error?.status === 404) return 'info'
  if (error?.status === 429) return 'warning'
  return 'danger'
}

/** Errores en los que reintentar tiene sentido: red, timeout y 5xx. */
export function isRetryable(error) {
  return error?.status === 0 || error?.status >= 500
}
