import { useQuery } from '@tanstack/react-query'
import { getHealth } from '../api/routes/health.js'

export const HEALTH_INTERVAL_MS = 60_000

/** Estado de GET /health, consultado al cargar y cada 60 s. */
export function useHealth() {
  const query = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: HEALTH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: false,
  })

  let status = 'checking'
  if (query.isError) status = 'offline'
  else if (query.isSuccess) status = 'online'

  return {
    status,
    checkedAt: query.dataUpdatedAt || query.errorUpdatedAt || null,
    refetch: query.refetch,
  }
}
