import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { runScan } from '../api/routes/scan.js'

const resultKey = (kind) => ['scan-result', kind]
const mutationKey = (kind) => ['scan', kind]

// Un AbortController por tipo de escaneo, fuera del componente: si el usuario cambia de pestaña
// y vuelve, todavía puede cancelar el escaneo en curso.
const controllers = new Map()

/**
 * Escaneo de facturas (DESIGN.md §5.3 y §6.5).
 * El último resultado de cada tipo se guarda en la caché de React Query (sin caducidad) para que
 * se conserve al cambiar de pestaña; se borra al cerrar sesión con el resto de la caché.
 * @param {'received' | 'sent'} kind
 */
export function useScan(kind) {
  const queryClient = useQueryClient()

  const last = useQuery({
    queryKey: resultKey(kind),
    queryFn: () => null,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const mutation = useMutation({
    mutationKey: mutationKey(kind),
    mutationFn: async ({ payload }) => {
      const controller = new AbortController()
      controllers.set(kind, controller)
      try {
        return await runScan(kind, payload, { signal: controller.signal })
      } finally {
        if (controllers.get(kind) === controller) controllers.delete(kind)
      }
    },
    onSuccess: (result, { payload, form }) => {
      queryClient.setQueryData(resultKey(kind), { result, payload, form, finishedAt: Date.now() })
    },
  })

  // Escaneo en curso aunque lo haya lanzado otra instancia de la página (antes de cambiar de pestaña).
  const pending = useMutationState({
    filters: { mutationKey: mutationKey(kind), status: 'pending' },
    select: (m) => m.state.variables,
  })
  const running = pending.length > 0 ? pending[pending.length - 1] : null

  const { mutate } = mutation
  const start = useCallback(
    (payload, form, callbacks) => mutate({ payload, form, startedAt: Date.now() }, callbacks),
    [mutate],
  )
  const cancel = useCallback(() => controllers.get(kind)?.abort(), [kind])

  return {
    last: last.data ?? null,
    isRunning: Boolean(running),
    startedAt: running?.startedAt ?? null,
    error: mutation.error,
    resetError: mutation.reset,
    start,
    cancel,
  }
}
