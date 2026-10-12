import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'

// La página /_kit solo se registra en desarrollo; en el build de producción esta rama se elimina.
const KitPage = import.meta.env.DEV ? lazy(() => import('./pages/KitPage.jsx')) : null

function Placeholder() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-bg text-fg">
      <div className="text-center">
        <h1 className="text-xl font-semibold">ServFacGmail</h1>
        <p className="mt-1 text-sm text-fg-muted">Panel en construcción</p>
      </div>
    </main>
  )
}

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        {KitPage && <Route path="/_kit" element={<KitPage />} />}
        <Route path="*" element={<Placeholder />} />
      </Routes>
    </Suspense>
  )
}

export default App
