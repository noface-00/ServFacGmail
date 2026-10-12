import { useCallback, useMemo, useState } from 'react'
import { getSelectedAccount, setSelectedAccount } from '../lib/storage.js'
import { AccountContext } from './accountContext.js'

/**
 * Cuenta de Gmail elegida en la barra superior; la usan por defecto las pantallas de escaneo.
 * Se monta dentro de la zona autenticada, así que se reinicia con cada sesión.
 */
export function AccountProvider({ children }) {
  const [selectedAccount, setSelected] = useState(getSelectedAccount)

  const selectAccount = useCallback((email) => {
    setSelectedAccount(email)
    setSelected(email)
  }, [])

  const value = useMemo(() => ({ selectedAccount, selectAccount }), [selectedAccount, selectAccount])
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
