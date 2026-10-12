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
