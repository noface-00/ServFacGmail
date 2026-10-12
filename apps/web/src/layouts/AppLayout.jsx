import { useState } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from '../components/layout/Sidebar.jsx'
import { TopBar } from '../components/layout/TopBar.jsx'
import { useModal } from '../components/ui/useModal.js'

/**
 * Armazón de la aplicación: TopBar fija, Sidebar (232 px · 64 px bajo 1200 px · drawer bajo
 * 768 px) y contenido de hasta 1280 px. Los datos de sesión llegan por props hasta la Fase 2.
 */
export function AppLayout({ isAdmin = false, accountSelector, health, themeToggle, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const menuRef = useModal({ open: menuOpen, onClose: closeMenu })

  return (
    <div className="min-h-svh bg-bg">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-fg focus:shadow-lg"
        style={{ zIndex: 'var(--sf-z-toast)' }}
      >
        Saltar al contenido
      </a>
      <TopBar
        accountSelector={accountSelector}
        health={health}
        themeToggle={themeToggle}
        isAdmin={isAdmin}
        onLogout={onLogout}
        onOpenMenu={() => setMenuOpen(true)}
      />

      <aside className="fixed top-14 bottom-0 left-0 hidden w-16 border-r border-border bg-surface md:block nav:w-[232px]">
        <Sidebar isAdmin={isAdmin} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 md:hidden" style={{ zIndex: 'var(--sf-z-drawer)' }}>
          <div aria-hidden className="absolute inset-0 bg-black/30" onClick={closeMenu} />
          <div
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navegación"
            className="absolute inset-y-0 left-0 w-[260px] border-r border-border bg-surface pt-2 shadow-lg"
          >
            <Sidebar isAdmin={isAdmin} expanded onNavigate={closeMenu} />
          </div>
        </div>
      )}

      <div className="pt-14 md:pl-16 nav:pl-[232px]">
        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1280px] px-4 py-6 outline-none sm:px-6">{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}
