import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import api from '../api/axios.js'
import { getApiKey, getRole } from '../lib/storage.js'
import { API, CLIENT_KEY, MASTER_KEY, server } from './msw/server.js'
import { renderApp } from './renderApp.jsx'

async function loginWith(key) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Clave de API'), key)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  return user
}

const adminNav = () => screen.queryByRole('link', { name: 'Claves de API' })

describe('Acceso', () => {
  it('redirects to the login screen when there is no session', async () => {
    renderApp('/escanear/recibidas')
    expect(await screen.findByRole('heading', { name: 'Acceder al panel' })).toBeInTheDocument()
  })

  it('logs in with a client key and hides Administración', async () => {
    renderApp('/')
    await loginWith(CLIENT_KEY)
    expect(await screen.findByRole('heading', { name: 'Facturas recibidas' })).toBeInTheDocument()
    expect(adminNav()).not.toBeInTheDocument()
    expect(getApiKey()).toBe(CLIENT_KEY)
    expect(getRole()).toBe('client')
  })

  it('detects the admin role with the master key', async () => {
    renderApp('/')
    await loginWith(MASTER_KEY)
    expect(await screen.findByRole('heading', { name: 'Facturas recibidas' })).toBeInTheDocument()
    expect(adminNav()).toBeInTheDocument()
    expect(getRole()).toBe('admin')
  })

  it('shows an error and stays on Acceso with an invalid key', async () => {
    renderApp('/')
    await loginWith('clave-incorrecta')
    expect(await screen.findByText('La clave no es válida.')).toBeInTheDocument()
    expect(screen.getByLabelText('Clave de API')).toHaveAttribute('aria-invalid', 'true')
    expect(getApiKey()).toBeNull()
  })

  it('explains a 503 from an unconfigured service', async () => {
    server.use(
      http.get(`${API}/accounts`, () =>
        HttpResponse.json(
          { userMessage: 'Servicio no disponible temporalmente.', technicalError: 'SERVICE_API_KEY is not configured in the environment' },
          { status: 503 },
        ),
      ),
    )
    renderApp('/')
    await loginWith(MASTER_KEY)
    expect(await screen.findByText('El servicio no está configurado.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Detalle técnico')
  })

  it('asks for a key instead of calling the API when the field is empty', async () => {
    let calls = 0
    server.use(http.get(`${API}/accounts`, () => (calls++, HttpResponse.json({ accounts: [], count: 0 }))))
    renderApp('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }))
    expect(screen.getByText('Ingrese su clave de API.')).toBeInTheDocument()
    expect(calls).toBe(0)
  })

  it('returns to the page that was requested before logging in', async () => {
    renderApp('/cuentas')
    await loginWith(CLIENT_KEY)
    expect(await screen.findByRole('heading', { name: 'Cuentas' })).toBeInTheDocument()
  })
})

describe('Sesión activa', () => {
  it('blocks admin routes for a client key', async () => {
    renderApp('/admin/claves', { session: { apiKey: CLIENT_KEY, role: 'client' } })
    expect(await screen.findByText('Solo administradores')).toBeInTheDocument()
  })

  it('opens admin routes for the master key', async () => {
    renderApp('/admin/claves', { session: { apiKey: MASTER_KEY, role: 'admin' } })
    expect(await screen.findByRole('heading', { name: 'Claves de API' })).toBeInTheDocument()
  })

  it('logs out and returns to Acceso when the API answers 401', async () => {
    // La barra superior carga /accounts al entrar: con una clave revocada responde 401.
    renderApp('/cuentas', { session: { apiKey: 'sfg_revocada', role: 'client' } })

    expect(await screen.findByRole('heading', { name: 'Acceder al panel' })).toBeInTheDocument()
    expect(screen.getByText('Su clave de API no es válida o fue revocada.')).toBeInTheDocument()
    expect(getApiKey()).toBeNull()
  })

  it('returns to the same page after logging in again', async () => {
    renderApp('/cuentas', { session: { apiKey: 'sfg_revocada', role: 'client' } })
    await screen.findByRole('heading', { name: 'Acceder al panel' })
    await loginWith(CLIENT_KEY)
    expect(await screen.findByRole('heading', { name: 'Cuentas' })).toBeInTheDocument()
  })

  it('shows the service unavailable screen on 503', async () => {
    server.use(http.get(`${API}/accounts`, () => HttpResponse.json({ userMessage: 'No disponible.' }, { status: 503 })))
    renderApp('/cuentas', { session: { apiKey: CLIENT_KEY, role: 'client' } })
    expect(await screen.findByRole('heading', { name: 'Servicio no disponible' })).toBeInTheDocument()
  })

  it('reacts to a 401 from any request made during the session', async () => {
    renderApp('/escanear/recibidas', { session: { apiKey: CLIENT_KEY, role: 'client' } })
    await screen.findByRole('heading', { name: 'Facturas recibidas' })
    server.use(http.get(`${API}/accounts`, () => HttpResponse.json({ userMessage: 'No autorizado.' }, { status: 401 })))

    await act(async () => {
      await api.get('/accounts').catch(() => {})
    })

    expect(await screen.findByRole('heading', { name: 'Acceder al panel' })).toBeInTheDocument()
  })

  it('logs out from the top bar', async () => {
    renderApp('/escanear/recibidas', { session: { apiKey: CLIENT_KEY, role: 'client' } })
    await userEvent.click(await screen.findByRole('button', { name: /Cerrar sesión/ }))
    expect(await screen.findByRole('heading', { name: 'Acceder al panel' })).toBeInTheDocument()
    expect(getApiKey()).toBeNull()
  })

  it('shows the API status from /health in the top bar', async () => {
    renderApp('/escanear/recibidas', { session: { apiKey: CLIENT_KEY, role: 'client' } })
    expect(await screen.findByText('API en línea')).toBeInTheDocument()
  })

  it('shows the API as offline when /health fails', async () => {
    server.use(http.get(`${API}/health`, () => HttpResponse.error()))
    renderApp('/escanear/recibidas', { session: { apiKey: CLIENT_KEY, role: 'client' } })
    await waitFor(() => expect(screen.getByText('API sin conexión')).toBeInTheDocument())
  })
})
