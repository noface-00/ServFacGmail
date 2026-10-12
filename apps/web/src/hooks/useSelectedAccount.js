import { useContext, useEffect } from 'react'
import { AccountContext } from '../stores/accountContext.js'

export function useSelectedAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useSelectedAccount debe usarse dentro de <AccountProvider>')
  return ctx
}

/**
 * Mantiene la cuenta elegida dentro de la lista visible: si no hay ninguna o la elegida ya no
 * está (se desconectó o la clave no la ve), elige la primera.
 */
export function useKeepSelectedAccountValid(accounts, isReady) {
  const { selectedAccount, selectAccount } = useSelectedAccount()

  useEffect(() => {
    if (!isReady) return
    const emails = accounts.map((a) => a.email)
    if (selectedAccount && emails.includes(selectedAccount)) return
    selectAccount(emails[0] ?? null)
  }, [accounts, isReady, selectedAccount, selectAccount])
}
