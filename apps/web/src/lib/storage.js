// Sesión en sessionStorage (DESIGN.md §5.1): se pierde al cerrar la pestaña y nunca va a localStorage.
// Todos los accesos van en try/catch: el storage puede no existir o estar bloqueado.

const KEYS = { apiKey: 'sf.apiKey', role: 'sf.role', account: 'sf.account' }

function read(key) {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) window.sessionStorage.removeItem(key)
    else window.sessionStorage.setItem(key, value)
  } catch {
    // Sin storage la sesión dura lo que dure la página.
  }
}

export const getApiKey = () => read(KEYS.apiKey)
export const getRole = () => read(KEYS.role)
export const getSelectedAccount = () => read(KEYS.account)
export const setSelectedAccount = (email) => write(KEYS.account, email)

export function saveSession({ apiKey, role }) {
  write(KEYS.apiKey, apiKey)
  write(KEYS.role, role)
}

export function clearSession() {
  write(KEYS.apiKey, null)
  write(KEYS.role, null)
  write(KEYS.account, null)
}
