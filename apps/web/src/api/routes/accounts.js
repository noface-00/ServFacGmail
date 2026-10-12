import api from '../axios.js'

/**
 * @typedef {{ email: string, connectedAt: string, updatedAt: string }} GmailAccount
 */

/**
 * GET /accounts → { accounts, count }. Una clave restringida solo ve sus cuentas.
 * Con `apiKey` se valida una clave que aún no está en la sesión (pantalla de Acceso).
 * @returns {Promise<{ accounts: GmailAccount[], count: number }>}
 */
export async function listAccounts({ apiKey } = {}) {
  const { data } = await api.get('/accounts', apiKey ? { headers: { 'x-api-key': apiKey }, skipSessionHandling: true } : {})
  return data
}

/**
 * GET /auth/google/login (solo clave maestra) → URL de consentimiento de Google.
 * El `state` firmado que lleva caduca a los 10 minutos.
 * @returns {Promise<string>}
 */
export async function getAuthUrl() {
  const { data } = await api.get('/auth/google/login')
  return data.authUrl
}

/**
 * DELETE /accounts/:email (solo clave maestra) → { userMessage, email }. 404 si no está conectada.
 * @returns {Promise<{ userMessage: string, email: string }>}
 */
export async function deleteAccount(email) {
  const { data } = await api.delete(`/accounts/${encodeURIComponent(email)}`)
  return data
}
