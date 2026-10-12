import { createContext } from 'react'

/**
 * @type {import('react').Context<{
 *   apiKey: string | null,
 *   role: 'admin' | 'client' | null,
 *   isAuthenticated: boolean,
 *   isAdmin: boolean,
 *   notice: string | null,
 *   login: (session: { apiKey: string, role: 'admin' | 'client' }) => void,
 *   logout: (notice?: string) => void,
 *   clearNotice: () => void,
 * } | null>}
 */
export const SessionContext = createContext(null)
