import { useCallback, useState } from 'react'
import { applyTheme, getStoredTheme } from '../lib/theme.js'

/** Tema actual ('system' | 'light' | 'dark') y su setter, que lo aplica y lo recuerda. */
export function useTheme() {
  const [theme, setThemeState] = useState(getStoredTheme)
  const setTheme = useCallback((next) => {
    applyTheme(next)
    setThemeState(next)
  }, [])
  return { theme, setTheme }
}
