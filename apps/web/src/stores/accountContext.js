import { createContext } from 'react'

/** @type {import('react').Context<{ selectedAccount: string | null, selectAccount: (email: string | null) => void } | null>} */
export const AccountContext = createContext(null)
