// Tema claro / oscuro / del sistema (DESIGN.md §3.3). La elección es una comodidad por usuario:
// va en localStorage (no en la sesión) y public/theme-init.js la aplica antes de pintar.

const STORAGE_KEY = 'sf.theme'
export const THEMES = ['system', 'light', 'dark']

export function getStoredTheme() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

/** Aplica el tema en <html data-theme> y lo recuerda; 'system' sigue a prefers-color-scheme. */
export function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme
  else delete root.dataset.theme
  try {
    if (theme === 'system') window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Sin storage el tema dura lo que dure la página.
  }
}
