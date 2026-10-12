import axios from 'axios'
import { getApiKey } from '../lib/storage.js'
import { normalizeError } from './errors.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Reacciones globales a 401 (cerrar sesión) y 503 (pantalla de servicio no disponible).
// Las registra la app al montar la zona autenticada; aquí solo se invocan.
const handlers = { unauthorized: null, unavailable: null }

/** Registra los manejadores globales; devuelve la función para quitarlos. */
export function setApiEventHandlers({ onUnauthorized, onUnavailable }) {
  handlers.unauthorized = onUnauthorized ?? null
  handlers.unavailable = onUnavailable ?? null
  return () => {
    handlers.unauthorized = null
    handlers.unavailable = null
  }
}

// La clave de la sesión va en x-api-key, salvo que la petición ya traiga una (validación en Acceso).
api.interceptors.request.use((config) => {
  if (!config.headers.has('x-api-key')) {
    const apiKey = getApiKey()
    if (apiKey) config.headers.set('x-api-key', apiKey)
  }
  return config
})

// `skipSessionHandling: true` en la config evita los manejadores globales (lo usa el login,
// donde un 401 significa "clave incorrecta", no "sesión caducada").
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Con responseType 'blob' el JSON de error llega como Blob: se lee para no perder el userMessage.
    const data = error?.response?.data
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await data.text())
      } catch {
        // No era JSON: se usa el mensaje por defecto del estado HTTP.
      }
    }
    const apiError = normalizeError(error)
    if (!error?.config?.skipSessionHandling) {
      if (apiError.status === 401) handlers.unauthorized?.(apiError)
      else if (apiError.status === 503) handlers.unavailable?.(apiError)
    }
    return Promise.reject(apiError)
  },
)

export default api
