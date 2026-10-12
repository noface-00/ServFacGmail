import { Logo } from '../components/layout/Logo.jsx'

/** Pantallas fuera de la sesión (Acceso, Servicio no disponible): tarjeta centrada. */
export function AuthLayout({ aside, footer, children }) {
  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Logo />
        {aside}
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
      {footer && <footer className="px-4 pb-6 text-center text-xs text-fg-subtle">{footer}</footer>}
    </div>
  )
}
