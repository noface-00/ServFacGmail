// Formato único de error (DESIGN.md §6.1): toda falla de la API llega a la UI como ApiError
// con { status, userMessage, technicalError }. status 0 = sin respuesta (red, timeout, cancelado).

const DEFAULT_MESSAGES = {
  400: 'La solicitud no es válida.',
  401: 'Su clave de API no es válida o fue revocada.',
  403: 'No tiene permisos para realizar esta operación.',
  404: 'No se encontró el recurso solicitado.',
  429: 'Demasiadas solicitudes. Espere un momento e inténtelo de nuevo.',
  500: 'Ocurrió un error en el servicio.',
  503: 'El servicio no está disponible.',
}

export const NETWORK_MESSAGE = 'No se pudo contactar con el servicio.'
export const TIMEOUT_MESSAGE = 'El servicio tardó demasiado en responder.'
export const CANCELED_MESSAGE = 'La operación se canceló.'

export class ApiError extends Error {
  /**
   * @param {{ status: number, userMessage: string, technicalError?: string, code?: 'http' | 'network' | 'timeout' | 'canceled', retryAfter?: number | null }} init
   */
  constructor({ status, userMessage, technicalError, code = 'http', retryAfter = null }) {
    super(userMessage)
    this.name = 'ApiError'
    this.status = status
    this.userMessage = userMessage
    this.technicalError = technicalError
    this.code = code
    this.retryAfter = retryAfter
  }
}

/** Convierte cualquier error de axios (o desconocido) en ApiError. */
export function normalizeError(error) {
  if (error instanceof ApiError) return error

  if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError') {
    return new ApiError({ status: 0, code: 'canceled', userMessage: CANCELED_MESSAGE, technicalError: 'Request canceled' })
  }

  const response = error?.response
  if (response) {
    const data = response.data && typeof response.data === 'object' ? response.data : {}
    const retryAfterHeader = Number(response.headers?.['retry-after'])
    return new ApiError({
      status: response.status,
      userMessage:
        typeof data.userMessage === 'string' && data.userMessage
          ? data.userMessage
          : (DEFAULT_MESSAGES[response.status] ?? 'Ocurrió un error inesperado.'),
      technicalError:
        typeof data.technicalError === 'string' ? data.technicalError : `HTTP ${response.status} ${error.message ?? ''}`.trim(),
      retryAfter: Number.isFinite(retryAfterHeader) ? retryAfterHeader : null,
    })
  }

  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return new ApiError({ status: 0, code: 'timeout', userMessage: TIMEOUT_MESSAGE, technicalError: error.message })
  }

  return new ApiError({
    status: 0,
    code: 'network',
    userMessage: NETWORK_MESSAGE,
    technicalError: error?.message ?? String(error),
  })
}
