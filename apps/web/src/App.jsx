import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './layouts/AppShell.jsx'
import { RequireAdmin } from './layouts/RequireAdmin.jsx'
import { RequireAuth } from './layouts/RequireAuth.jsx'
import AccountsPage from './pages/AccountsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PendingPage from './pages/PendingPage.jsx'
import ScanPage from './pages/ScanPage.jsx'
import ServiceUnavailablePage from './pages/ServiceUnavailablePage.jsx'

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
              <Route path="claves" element={<PendingPage title="Claves de API" phase={6} icon="key" />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
