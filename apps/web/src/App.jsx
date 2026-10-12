import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './layouts/AppShell.jsx'
import { RequireAdmin } from './layouts/RequireAdmin.jsx'
import { RequireAuth } from './layouts/RequireAuth.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ServiceUnavailablePage from './pages/ServiceUnavailablePage.jsx'

// Las pantallas de la zona autenticada se cargan bajo demanda: Acceso (la primera que se ve sin
// sesión) queda en el bundle inicial.
const ScanPage = lazy(() => import('./pages/ScanPage.jsx'))
const AccountsPage = lazy(() => import('./pages/AccountsPage.jsx'))
const ApiKeysPage = lazy(() => import('./pages/ApiKeysPage.jsx'))

// La página /_kit solo se registra en desarrollo; en el build de producción esta rama se elimina.
const KitPage = import.meta.env.DEV ? lazy(() => import('./pages/KitPage.jsx')) : null

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/acceso" element={<LoginPage />} />
        <Route path="/servicio-no-disponible" element={<ServiceUnavailablePage />} />
        {KitPage && <Route path="/_kit" element={<KitPage />} />}

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/escanear/recibidas" replace />} />
            <Route path="escanear/recibidas" element={<ScanPage key="received" kind="received" />} />
            <Route path="escanear/emitidas" element={<ScanPage key="sent" kind="sent" />} />
            <Route path="cuentas" element={<AccountsPage />} />
            <Route path="admin" element={<RequireAdmin />}>
              <Route path="cuentas" element={<AccountsPage adminView />} />
              <Route path="claves" element={<ApiKeysPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
