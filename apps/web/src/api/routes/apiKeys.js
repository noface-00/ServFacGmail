import api from '../axios.js'

/**
 * @typedef {{ id: string, name: string, keyPrefix: string, allowedAccounts: string[], createdAt: string, lastUsedAt: string | null, revokedAt: string | null }} ApiKey
 */

/**
 * GET /admin/api-keys (solo clave maestra).
 * Con `apiKey` se usa para detectar el rol en Acceso: 200 → admin, 403 → cliente.
 * @returns {Promise<{ apiKeys: ApiKey[], count: number }>}
 */
export async function listApiKeys({ apiKey } = {}) {
  const { data } = await api.get('/admin/api-keys', apiKey ? { headers: { 'x-api-key': apiKey }, skipSessionHandling: true } : {})
  return data
}

/**
 * POST /admin/api-keys → 201 { userMessage, key, apiKey }. `key` (sfg_…) solo se recibe aquí:
 * la API guarda únicamente su hash. `allowedAccounts` vacío = acceso a todas las cuentas.
 * @param {{ name: string, allowedAccounts: string[] }} input
 * @returns {Promise<{ userMessage: string, key: string, apiKey: ApiKey }>}
 */
export async function createApiKey({ name, allowedAccounts }) {
  const { data } = await api.post('/admin/api-keys', { name, allowedAccounts })
  return data
}

/**
 * DELETE /admin/api-keys/:id → { userMessage, id }. Marca `revokedAt`; 404 si no existe.
 * @returns {Promise<{ userMessage: string, id: string }>}
 */
export async function revokeApiKey(id) {
  const { data } = await api.delete(`/admin/api-keys/${encodeURIComponent(id)}`)
  return data
}
