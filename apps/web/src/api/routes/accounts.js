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
