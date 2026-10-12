// Aplica el tema elegido antes del primer pintado (sin parpadeo). Archivo externo, no inline,
// para que funcione con una CSP script-src 'self'. Ver src/lib/theme.js.
try {
  var theme = window.localStorage.getItem('sf.theme')
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme
} catch {
  // Sin storage: se usa el tema del sistema.
}
