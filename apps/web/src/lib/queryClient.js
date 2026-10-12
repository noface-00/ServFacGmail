import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Los errores 4xx no mejoran reintentando; solo se reintenta una vez ante red o 5xx.
      queries: {
        retry: (count, error) => count < 1 && !(error?.status >= 400 && error?.status < 500),
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  })
}
