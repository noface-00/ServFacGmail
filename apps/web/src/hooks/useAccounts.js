import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteAccount, listAccounts } from '../api/routes/accounts.js'

export const ACCOUNTS_KEY = ['accounts']

/** Cuentas de Gmail conectadas que la clave de la sesión puede ver. */
export function useAccounts() {
  const query = useQuery({ queryKey: ACCOUNTS_KEY, queryFn: () => listAccounts() })
  return { ...query, accounts: query.data?.accounts ?? [] }
}

/** Desconecta una cuenta y refresca la lista (también tras un 404: la cuenta ya no estaba). */
export function useDisconnectAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email) => deleteAccount(email),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  })
}
