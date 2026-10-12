import { IconButton } from '../ui/Button.jsx'

const NEXT = { system: 'light', light: 'dark', dark: 'system' }
const ICONS = { system: 'contrast', light: 'light_mode', dark: 'dark_mode' }
const LABELS = { system: 'del sistema', light: 'claro', dark: 'oscuro' }

/** Botón que alterna tema del sistema → claro → oscuro. */
export function ThemeToggle({ theme, onChange, size = 'sm' }) {
  return (
    <IconButton
      size={size}
      icon={ICONS[theme]}
      label={`Tema ${LABELS[theme]}. Cambiar a tema ${LABELS[NEXT[theme]]}`}
      onClick={() => onChange(NEXT[theme])}
    />
  )
}
