import { useMutation } from '@tanstack/react-query'
import { listAccounts } from '../api/routes/accounts.js'
import { listApiKeys } from '../api/routes/apiKeys.js'
import { useSession } from './useSession.js'

/**
 * Valida una clave y detecta su rol (DESIGN.md §2 y §5.1):
 * 1. GET /accounts con la clave → 200 válida · 401 inválida · 503 servicio sin configurar.
 * 2. GET /admin/api-keys → 200 admin · 403 cliente.
 * Si todo va bien, guarda la sesión.
 */
export function useLogin() {
  const { login } = useSession()

  return useMutation({
    mutationFn: async (rawKey) => {
      const apiKey = rawKey.trim()
      await listAccounts({ apiKey })
      const role = await detectRole(apiKey)
      return { apiKey, role }
    },
    onSuccess: (session) => login(session),
  })
}

async function detectRole(apiKey) {
  try {
    await listApiKeys({ apiKey })
    return 'admin'
  } catch (error) {
    if (error.status === 403) return 'client'
    throw error
  }
}
