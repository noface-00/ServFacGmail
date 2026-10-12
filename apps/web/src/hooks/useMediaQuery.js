import { useSyncExternalStore } from 'react'

/** true mientras se cumple la media query. Sin matchMedia (pruebas, SSR) devuelve false. */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
    () => false,
  )
}

/** Bajo el breakpoint md (768 px): tablas como tarjetas, navegación como drawer. */
export const MOBILE_QUERY = '(max-width: 767.98px)'
