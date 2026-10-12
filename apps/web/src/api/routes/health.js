import api from '../axios.js'

/** GET /health (sin autenticación) → { status: 'ok', service } */
export async function getHealth() {
  const { data } = await api.get('/health', { timeout: 5000, skipSessionHandling: true })
  return data
}
