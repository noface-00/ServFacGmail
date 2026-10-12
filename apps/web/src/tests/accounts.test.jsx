import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../AppProviders.jsx'
import { findConnectedAccount, useConnectAccount } from '../hooks/useConnectAccount.js'
import { createQueryClient } from '../lib/queryClient.js'
import { getSelectedAccount } from '../lib/storage.js'
import { API, CLIENT_KEY, MASTER_KEY, server } from './msw/server.js'
import { renderApp } from './renderApp.jsx'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth?state=firmado'
const admin = { apiKey: MASTER_KEY, role: 'admin' }
const client = { apiKey: CLIENT_KEY, role: 'client' }

const account = (email, updatedAt = '2026-10-01T10:00:00.000Z') => ({
  email,
  connectedAt: '2026-09-01T10:00:00.000Z',
  updatedAt,
})

/** Estado de la "base de datos" simulada: cada prueba lo ajusta. */
let db

beforeEach(() => {
  db = [account('contabilidad@empresa.com'), account('pagos@empresa.com')]
  server.use(
    http.get(`${API}/accounts`, ({ request }) => {
      const key = request.headers.get('x-api-key')
      if (key !== MASTER_KEY && key !== CLIENT_KEY) return HttpResponse.json({ userMessage: 'No autorizado.' }, { status: 401 })
      // La clave de cliente está restringida a contabilidad@ (allowedAccounts).
      const visible = key === CLIENT_KEY ? db.filter((a) => a.email === 'contabilidad@empresa.com') : db
      return HttpResponse.json({ accounts: visible, count: visible.length })
    }),
    http.get(`${API}/auth/google/login`, () => HttpResponse.json({ authUrl: AUTH_URL })),
    http.delete(`${API}/accounts/:email`, ({ params }) => {
      const email = decodeURIComponent(params.email)
      if (!db.some((a) => a.email === email)) {
        return HttpResponse.json(
          { userMessage: 'La cuenta indicada no está conectada.', technicalError: `Account ${email} not found` },
          { status: 404 },
        )
      }
      db = db.filter((a) => a.email !== email)
      return HttpResponse.json({ userMessage: 'Cuenta desconectada correctamente.', email })
    }),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

function fakePopup() {
  return { closed: false, opener: {}, location: { href: '' }, document: { title: '', body: {} }, close: vi.fn() }
}

const table = async () => within(await screen.findByRole('table', { name: 'Cuentas de Gmail conectadas' }))

describe('Listado de cuentas', () => {
  it('shows every account with admin actions for the master key', async () => {
    renderApp('/cuentas', { session: admin })
    const t = await table()
    expect(await t.findByText('contabilidad@empresa.com')).toBeInTheDocument()
    expect(t.getByText('pagos@empresa.com')).toBeInTheDocument()
    expect(t.getByRole('button', { name: 'Desconectar pagos@empresa.com' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conectar cuenta de Gmail' })).toBeInTheDocument()
  })

  it('shows only the allowed accounts and no admin actions for a client key', async () => {
    renderApp('/cuentas', { session: client })
    const t = await table()
    expect(await t.findByText('contabilidad@empresa.com')).toBeInTheDocument()
    expect(t.queryByText('pagos@empresa.com')).not.toBeInTheDocument()
    expect(t.queryByRole('button', { name: /Desconectar/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Conectar cuenta de Gmail' })).not.toBeInTheDocument()
  })

  it('reuses the view under Administración', async () => {
    renderApp('/admin/cuentas', { session: admin })
    expect(await screen.findByRole('heading', { name: 'Cuentas de Gmail' })).toBeInTheDocument()
    expect(await (await table()).findByText('pagos@empresa.com')).toBeInTheDocument()
  })

  it('has a different empty state for admin and client', async () => {
    db = []
    const { unmount } = renderApp('/cuentas', { session: admin })
    expect(await screen.findByText('Conecte una cuenta de Gmail para empezar a buscar facturas.')).toBeInTheDocument()
    unmount()
    window.sessionStorage.clear()

    renderApp('/cuentas', { session: client })
    expect(await screen.findByText('Pida a un administrador que conecte una cuenta o que le dé acceso a ella.')).toBeInTheDocument()
  })

  it('shows the API error inside the view', async () => {
    server.use(
      http.get(`${API}/accounts`, () =>
        HttpResponse.json({ userMessage: 'Ocurrió un error al obtener las cuentas conectadas.', technicalError: 'db down' }, { status: 500 }),
      ),
    )
    renderApp('/cuentas', { session: admin })
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error al obtener las cuentas conectadas.')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('Selector de cuenta', () => {
  it('selects the first account and remembers the choice', async () => {
    renderApp('/cuentas', { session: admin })
    const selector = await screen.findByRole('combobox', { name: 'Cuenta de Gmail activa' })
    await waitFor(() => expect(selector).toHaveValue('contabilidad@empresa.com'))
    await userEvent.selectOptions(selector, 'pagos@empresa.com')
    expect(getSelectedAccount()).toBe('pagos@empresa.com')
  })

  it('"Escanear" picks the row account and opens the scan screen', async () => {
    renderApp('/cuentas', { session: admin })
    const t = await table()
    await t.findByText('pagos@empresa.com')
    const row = t.getByText('pagos@empresa.com').closest('tr')
    await userEvent.click(within(row).getByRole('button', { name: 'Escanear' }))
    expect(await screen.findByRole('heading', { name: 'Facturas recibidas' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Cuenta de Gmail activa' })).toHaveValue('pagos@empresa.com')
  })
})

describe('Conectar cuenta (OAuth)', () => {
  it('opens the popup inside the click and navigates it to Google', async () => {
    const popup = fakePopup()
    const open = vi.spyOn(window, 'open').mockReturnValue(popup)
    renderApp('/cuentas', { session: admin })
    await userEvent.click(await screen.findByRole('button', { name: 'Conectar cuenta de Gmail' }))
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Google' }))

    expect(open).toHaveBeenCalledWith('', 'sf-google-oauth', expect.stringContaining('width=520'))
    expect(await screen.findByText('Esperando autorización en Google…')).toBeInTheDocument()
    expect(popup.location.href).toBe(AUTH_URL)
    expect(popup.opener).toBeNull()
  })

  it('offers a link when the browser blocks the popup', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    renderApp('/cuentas', { session: admin })
    await userEvent.click(await screen.findByRole('button', { name: 'Conectar cuenta de Gmail' }))
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Google' }))

    expect(await screen.findByText('El navegador bloqueó la ventana emergente.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir Google en una pestaña nueva' })).toHaveAttribute('href', AUTH_URL)
    expect(screen.getByText('Esperando autorización en Google…')).toBeInTheDocument()
  })

  it('shows the API error and closes the popup when the login URL fails', async () => {
    const popup = fakePopup()
    vi.spyOn(window, 'open').mockReturnValue(popup)
    server.use(
      http.get(`${API}/auth/google/login`, () =>
        HttpResponse.json({ userMessage: 'Ocurrió un error al iniciar la conexión con Google.', technicalError: 'missing client id' }, { status: 500 }),
      ),
    )
    renderApp('/cuentas', { session: admin })
    await userEvent.click(await screen.findByRole('button', { name: 'Conectar cuenta de Gmail' }))
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Google' }))

    expect(await screen.findByText('Ocurrió un error al iniciar la conexión con Google.')).toBeInTheDocument()
    expect(popup.close).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})

describe('useConnectAccount', () => {
  function renderConnect(options) {
    window.sessionStorage.setItem('sf.apiKey', MASTER_KEY)
    const queryClient = createQueryClient()
    return renderHook(() => useConnectAccount(options), {
      wrapper: ({ children }) => <AppProviders queryClient={queryClient}>{children}</AppProviders>,
    })
  }

  it('polls /accounts until a new account appears', async () => {
    vi.spyOn(window, 'open').mockReturnValue(fakePopup())
    const onConnected = vi.fn()
    const { result } = renderConnect({ onConnected, pollInterval: 20 })

    await act(() => result.current.start())
    expect(result.current.status).toBe('waiting')

    db = [...db, account('nueva@empresa.com')]
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.email).toBe('nueva@empresa.com')
    expect(onConnected).toHaveBeenCalledWith('nueva@empresa.com')
  })

  it('detects a reconnection of an existing account by its updatedAt', async () => {
    vi.spyOn(window, 'open').mockReturnValue(fakePopup())
    const { result } = renderConnect({ pollInterval: 20 })
    await act(() => result.current.start())

    db = db.map((a) => (a.email === 'pagos@empresa.com' ? { ...a, updatedAt: '2026-10-12T12:00:00.000Z' } : a))
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.email).toBe('pagos@empresa.com')
  })

  it('expires when the link TTL runs out', async () => {
    vi.spyOn(window, 'open').mockReturnValue(fakePopup())
    const { result } = renderConnect({ pollInterval: 20, ttl: 60 })
    await act(() => result.current.start())
    await waitFor(() => expect(result.current.status).toBe('expired'))
  })

  it('cancel closes the popup and stops waiting', async () => {
    const popup = fakePopup()
    vi.spyOn(window, 'open').mockReturnValue(popup)
    const { result } = renderConnect({ pollInterval: 20 })
    await act(() => result.current.start())
    act(() => result.current.cancel())
    expect(result.current.status).toBe('idle')
    expect(popup.close).toHaveBeenCalled()
  })

  it('findConnectedAccount prefers new accounts over refreshed ones', () => {
    const snapshot = { 'a@x.com': Date.parse('2026-10-01T00:00:00Z') }
    expect(findConnectedAccount(snapshot, [account('a@x.com', '2026-10-01T00:00:00Z')])).toBeNull()
    expect(
      findConnectedAccount(snapshot, [account('a@x.com', '2026-10-05T00:00:00Z'), account('b@x.com', '2026-10-01T00:00:00Z')]),
    ).toBe('b@x.com')
    expect(findConnectedAccount(snapshot, [account('a@x.com', '2026-10-05T00:00:00Z')])).toBe('a@x.com')
  })
})

describe('Desconectar cuenta', () => {
  async function openDisconnect(email) {
    renderApp('/cuentas', { session: admin })
    const t = await table()
    await userEvent.click(await t.findByRole('button', { name: `Desconectar ${email}` }))
    return screen.getByRole('alertdialog', { name: `¿Desconectar ${email}?` })
  }

  it('requires typing the email before confirming, then removes the row', async () => {
    const dialog = await openDisconnect('pagos@empresa.com')
    const confirm = within(dialog).getByRole('button', { name: 'Desconectar cuenta' })
    expect(confirm).toBeDisabled()
    expect(within(dialog).getByLabelText('Escriba el correo para confirmar')).toHaveFocus()

    await userEvent.type(within(dialog).getByLabelText('Escriba el correo para confirmar'), 'pagos@empresa.com')
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)

    expect(await screen.findByText('Cuenta desconectada correctamente.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('cell', { name: 'pagos@empresa.com' })).not.toBeInTheDocument())
  })

  it('informs and refreshes the list when the account was already gone (404)', async () => {
    const dialog = await openDisconnect('pagos@empresa.com')
    db = db.filter((a) => a.email !== 'pagos@empresa.com')
    await userEvent.type(within(dialog).getByLabelText('Escriba el correo para confirmar'), 'pagos@empresa.com')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Desconectar cuenta' }))

    expect(await screen.findByText('La cuenta indicada no está conectada.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('cell', { name: 'pagos@empresa.com' })).not.toBeInTheDocument())
  })

  it('keeps the dialog open with the error on a 500', async () => {
    server.use(
      http.delete(`${API}/accounts/:email`, () =>
        HttpResponse.json({ userMessage: 'Ocurrió un error al desconectar la cuenta.', technicalError: 'db down' }, { status: 500 }),
      ),
    )
    const dialog = await openDisconnect('pagos@empresa.com')
    await userEvent.type(within(dialog).getByLabelText('Escriba el correo para confirmar'), 'pagos@empresa.com')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Desconectar cuenta' }))

    expect(await within(dialog).findByText('Ocurrió un error al desconectar la cuenta.')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})

describe('Errores de carga', () => {
  it('offers "Reintentar" on a network error and recovers', async () => {
    let fail = true
    server.use(
      http.get(`${API}/accounts`, () => (fail ? HttpResponse.error() : HttpResponse.json({ accounts: db, count: db.length }))),
    )
    renderApp('/cuentas', { session: admin })
    expect(await screen.findByText('No se pudo contactar con el servicio.')).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await (await table()).findByText('pagos@empresa.com')).toBeInTheDocument()
  })

  it('shows a 429 as a warning without retry', async () => {
    server.use(
      http.get(`${API}/accounts`, () => HttpResponse.json({ userMessage: 'Demasiadas solicitudes.' }, { status: 429 })),
    )
    renderApp('/cuentas', { session: admin })
    const message = await screen.findByText('Demasiadas solicitudes.')
    // Advertencia (role="status"), no error (role="alert").
    expect(message.closest('[role]')).toHaveAttribute('role', 'status')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })
})
