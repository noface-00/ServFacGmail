import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getAuthUrl, listAccounts } from '../api/routes/accounts.js'
import { ACCOUNTS_KEY } from './useAccounts.js'

export const OAUTH_POLL_MS = 3000
/** TTL del `state` firmado por la API (oauth-state.ts). */
export const OAUTH_TTL_MS = 10 * 60 * 1000

const POPUP_NAME = 'sf-google-oauth'
const POPUP_FEATURES = 'popup,width=520,height=640'

function toSnapshot(accounts) {
  return Object.fromEntries(accounts.map((a) => [a.email, new Date(a.updatedAt).getTime()]))
}

/**
 * Devuelve el correo recién conectado comparando con la foto previa: primero una cuenta nueva y,
 * si no hay, una existente cuyo `updatedAt` avanzó (reconectar hace upsert de la misma fila).
 */
export function findConnectedAccount(snapshot, accounts) {
  const added = accounts.find((a) => !(a.email in snapshot))
  if (added) return added.email
  const refreshed = accounts.find((a) => new Date(a.updatedAt).getTime() > snapshot[a.email])
  return refreshed?.email ?? null
}

/**
 * Flujo de conexión OAuth (DESIGN.md §6.2):
 * idle → starting → waiting (o blocked si el navegador bloqueó la ventana) → success | expired | error.
 *
 * La ventana se abre en blanco de forma síncrona dentro del clic (si se abre tras un `await` el
 * navegador la bloquea) y luego se dirige al `authUrl`. Mientras se espera se consulta /accounts
 * cada 3 s hasta que aparece la cuenta o caduca el enlace (10 min). No se usa `popup.closed`:
 * la página de Google aplica COOP y la referencia puede verse cerrada aunque siga abierta.
 */
export function useConnectAccount({ onConnected, pollInterval = OAUTH_POLL_MS, ttl = OAUTH_TTL_MS } = {}) {
  const queryClient = useQueryClient()
  const [state, setState] = useState({ status: 'idle' })
  const snapshot = useRef({})
  const popupRef = useRef(null)
  const onConnectedRef = useRef(onConnected)

  useEffect(() => {
    onConnectedRef.current = onConnected
  })

  const fetchAccounts = useCallback(
    () => queryClient.fetchQuery({ queryKey: ACCOUNTS_KEY, queryFn: () => listAccounts(), staleTime: 0 }),
    [queryClient],
  )

  const polling = state.status === 'waiting' || state.status === 'blocked'
  const expiresAt = state.expiresAt

  useEffect(() => {
    if (!polling) return
    let active = true

    const interval = setInterval(async () => {
      try {
        const data = await fetchAccounts()
        const email = active ? findConnectedAccount(snapshot.current, data.accounts) : null
        if (email) {
          active = false
          popupRef.current = null
          setState({ status: 'success', email })
          onConnectedRef.current?.(email)
        }
      } catch {
        // Fallos puntuales de red: se sigue esperando. Un 401 ya lo maneja el cliente HTTP.
      }
    }, pollInterval)

    const expiry = setTimeout(
      () => {
        if (!active) return
        active = false
        setState((s) => ({ ...s, status: 'expired' }))
      },
      Math.max(0, expiresAt - Date.now()),
    )

    return () => {
      active = false
      clearInterval(interval)
      clearTimeout(expiry)
    }
  }, [polling, expiresAt, pollInterval, fetchAccounts])

  const start = useCallback(async () => {
    const popup = window.open('', POPUP_NAME, POPUP_FEATURES)
    if (popup) {
      try {
        popup.opener = null
        popup.document.title = 'Conectando con Google…'
        popup.document.body.textContent = 'Conectando con Google…'
      } catch {
        // Ventana reutilizada en otro origen: se sobrescribe al navegar.
      }
    }
    popupRef.current = popup
    setState({ status: 'starting' })

    try {
      const current = await fetchAccounts()
      snapshot.current = toSnapshot(current.accounts)
      const authUrl = await getAuthUrl()
      const next = { authUrl, expiresAt: Date.now() + ttl }
      if (popup && !popup.closed) {
        popup.location.href = authUrl
        setState({ status: 'waiting', ...next })
      } else {
        setState({ status: 'blocked', ...next })
      }
    } catch (error) {
      popup?.close()
      popupRef.current = null
      setState({ status: 'error', error })
    }
  }, [fetchAccounts, ttl])

  const cancel = useCallback(() => {
    try {
      popupRef.current?.close()
    } catch {
      // Sin acceso a la ventana: el usuario la cierra a mano.
    }
    popupRef.current = null
    setState({ status: 'idle' })
  }, [])

  return { ...state, start, cancel }
}
