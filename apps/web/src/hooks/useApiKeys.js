import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createApiKey, listApiKeys, revokeApiKey } from '../api/routes/apiKeys.js'

export const API_KEYS_KEY = ['api-keys']

/** Claves de API (solo admin), de la más reciente a la más antigua. */
export function useApiKeys() {
  const query = useQuery({ queryKey: API_KEYS_KEY, queryFn: () => listApiKeys() })
  return { ...query, apiKeys: query.data?.apiKeys ?? [] }
}

/**
 * Crea una clave. `gcTime: 0` saca la mutación de la caché en cuanto nadie la observa: la clave en
 * claro solo debe vivir en el estado local de SecretRevealDialog (DESIGN.md §6.3).
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createApiKey,
    gcTime: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: API_KEYS_KEY }),
  })
}

/** Revoca una clave y refresca la lista (también tras un 404). */
export function useRevokeApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeApiKey,
    onSettled: () => queryClient.invalidateQueries({ queryKey: API_KEYS_KEY }),
  })
}
