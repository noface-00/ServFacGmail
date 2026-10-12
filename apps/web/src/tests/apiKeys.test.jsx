import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getApiKey } from '../lib/storage.js'
import { API, MASTER_KEY, server } from './msw/server.js'
import { renderApp } from './renderApp.jsx'

const admin = { apiKey: MASTER_KEY, role: 'admin' }
const NEW_KEY = 'sfg_9f3c2a7b1e5d4c8a0b6f'

const accounts = [
  { email: 'contabilidad@empresa.com', connectedAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-10-10T08:00:00.000Z' },
  { email: 'pagos@empresa.com', connectedAt: '2026-09-02T10:00:00.000Z', updatedAt: '2026-10-10T08:00:00.000Z' },
]

/** "Base de datos" simulada de claves: { summary, secret }. */
let keys
let lastCreateBody

const summaries = () => keys.map((k) => k.summary)

function principal(request) {
  const raw = request.headers.get('x-api-key')
  if (raw === MASTER_KEY) return { admin: true, allowed: [] }
  const found = keys.find((k) => k.secret === raw && !k.summary.revokedAt)
  return found ? { admin: false, allowed: found.summary.allowedAccounts } : null
}

const unauthorized = () => HttpResponse.json({ userMessage: 'No autorizado.' }, { status: 401 })

beforeEach(() => {
  lastCreateBody = undefined
  keys = [
    {
      secret: 'sfg_erp',
      summary: { id: 'k1', name: 'ERP contable', keyPrefix: 'sfg_a1b2', allowedAccounts: [], createdAt: '2026-09-01T10:00:00.000Z', lastUsedAt: '2026-10-12T07:00:00.000Z', revokedAt: null },
    },
    {
      secret: 'sfg_old',
      summary: { id: 'k0', name: 'Script antiguo', keyPrefix: 'sfg_zz99', allowedAccounts: ['pagos@empresa.com'], createdAt: '2026-08-01T10:00:00.000Z', lastUsedAt: null, revokedAt: '2026-09-01T10:00:00.000Z' },
    },
  ]
  server.use(
    http.get(`${API}/accounts`, ({ request }) => {
      const p = principal(request)
      if (!p) return unauthorized()
      const visible = p.allowed.length === 0 ? accounts : accounts.filter((a) => p.allowed.includes(a.email))
      return HttpResponse.json({ accounts: visible, count: visible.length })
    }),
    http.get(`${API}/admin/api-keys`, ({ request }) => {
      const p = principal(request)
      if (!p) return unauthorized()
      if (!p.admin) return HttpResponse.json({ userMessage: 'No tiene permisos para realizar esta operación.' }, { status: 403 })
      return HttpResponse.json({ apiKeys: summaries(), count: keys.length })
    }),
    http.post(`${API}/admin/api-keys`, async ({ request }) => {
      lastCreateBody = await request.json()
      const summary = {
        id: `k${keys.length + 1}`,
        name: lastCreateBody.name,
        keyPrefix: NEW_KEY.slice(0, 8),
        allowedAccounts: lastCreateBody.allowedAccounts ?? [],
        createdAt: '2026-10-12T09:00:00.000Z',
        lastUsedAt: null,
        revokedAt: null,
      }
      keys = [{ secret: NEW_KEY, summary }, ...keys]
      return HttpResponse.json({ userMessage: 'Clave creada. Guárdela ahora: no se volverá a mostrar.', key: NEW_KEY, apiKey: summary }, { status: 201 })
    }),
    http.delete(`${API}/admin/api-keys/:id`, ({ params }) => {
      const found = keys.find((k) => k.summary.id === params.id)
      if (!found) return HttpResponse.json({ userMessage: 'La clave de API indicada no existe.', technicalError: `No ApiKey found with id: ${params.id}` }, { status: 404 })
      found.summary = { ...found.summary, revokedAt: found.summary.revokedAt ?? '2026-10-12T09:30:00.000Z' }
      return HttpResponse.json({ userMessage: 'Clave revocada correctamente.', id: params.id })
    }),
  )
})

afterEach(() => vi.restoreAllMocks())

const table = async () => within(await screen.findByRole('table', { name: 'Claves de API' }))

async function createKey(user, { name = 'Portal de pagos', accounts: picks = ['pagos@empresa.com'] } = {}) {
  await user.click(await screen.findByRole('button', { name: 'Crear clave' }))
  const dialog = within(screen.getByRole('dialog', { name: 'Crear clave de API' }))
  if (name) await user.type(dialog.getByLabelText(/Nombre/), name)
  for (const email of picks) await user.click(await dialog.findByRole('button', { name: `Agregar ${email}` }))
  await user.click(dialog.getByRole('button', { name: 'Crear clave' }))
}

describe('Listado de claves', () => {
  it('shows active keys with prefix, scope and last use; revoked ones only on demand', async () => {
    renderApp('/admin/claves', { session: admin })
    const t = await table()
    const erp = (await t.findByText('ERP contable')).closest('tr')
    expect(within(erp).getByText('sfg_a1b2…')).toBeInTheDocument()
    expect(within(erp).getByText('Todas las cuentas')).toBeInTheDocument()
    expect(within(erp).getByText('Activa')).toBeInTheDocument()
    expect(t.queryByText('Script antiguo')).not.toBeInTheDocument()

    await userEvent.click(screen.getByLabelText(/Mostrar revocadas \(1\)/))
    const old = t.getByText('Script antiguo').closest('tr')
    expect(old).toHaveClass('opacity-60')
    expect(within(old).getByText('Revocada')).toBeInTheDocument()
    expect(within(old).getByText('Nunca')).toBeInTheDocument()
    expect(within(old).queryByRole('button', { name: /Revocar/ })).not.toBeInTheDocument()
  })

  it('explains what to do when there are no keys', async () => {
    keys = []
    renderApp('/admin/claves', { session: admin })
    expect(await screen.findByText('Cree una por cada sistema que vaya a consultar el servicio.')).toBeInTheDocument()
  })
})

describe('Crear clave', () => {
  it('validates the name before calling the API', async () => {
    const user = userEvent.setup()
    renderApp('/admin/claves', { session: admin })
    await createKey(user, { name: '', accounts: [] })
    expect(screen.getByText('Escriba un nombre para la clave.')).toBeInTheDocument()
    expect(lastCreateBody).toBeUndefined()
  })

  it('creates the key and reveals it once, blocking the close until it is saved', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderApp('/admin/claves', { session: admin })
    await createKey(user)

    expect(lastCreateBody).toEqual({ name: 'Portal de pagos', allowedAccounts: ['pagos@empresa.com'] })
    const reveal = await screen.findByRole('dialog', { name: 'Clave creada' })
    expect(within(reveal).getByLabelText('Clave de API')).toHaveTextContent(NEW_KEY)
    expect(within(reveal).getByText('Clave creada. Guárdela ahora: no se volverá a mostrar.')).toBeInTheDocument()

    const done = within(reveal).getByRole('button', { name: 'Listo' })
    expect(done).toBeDisabled()
    expect(within(reveal).queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Clave creada' })).toBeInTheDocument()

    await user.click(within(reveal).getByRole('button', { name: 'Copiar clave' }))
    expect(writeText).toHaveBeenCalledWith(NEW_KEY)
    expect(done).toBeEnabled()
    await user.click(done)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(NEW_KEY)).not.toBeInTheDocument()
    expect((await table()).getByText('Portal de pagos')).toBeInTheDocument()
  })

  it('enables "Listo" by ticking "Ya la guardé" when copying is not possible', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    renderApp('/admin/claves', { session: admin })
    await createKey(user)
    const reveal = within(await screen.findByRole('dialog', { name: 'Clave creada' }))
    await user.click(reveal.getByRole('button', { name: 'Copiar clave' }))
    expect(reveal.getByText('No se pudo copiar. Selecciónela y cópiela a mano.')).toBeInTheDocument()
    await user.click(reveal.getByLabelText('Ya la guardé en un lugar seguro'))
    expect(reveal.getByRole('button', { name: 'Listo' })).toBeEnabled()
  })

  it('maps a 400 from the API to the name field', async () => {
    server.use(
      http.post(`${API}/admin/api-keys`, () =>
        HttpResponse.json({ userMessage: 'Los datos enviados no son válidos.', technicalError: 'Invalid request: name: Too big' }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    renderApp('/admin/claves', { session: admin })
    await createKey(user)
    const dialog = within(screen.getByRole('dialog', { name: 'Crear clave de API' }))
    expect(await dialog.findByText('Los datos enviados no son válidos.')).toBeInTheDocument()
    expect(dialog.getByLabelText(/Nombre/)).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('Revocar clave', () => {
  async function openRevoke(user, name) {
    const t = await table()
    await user.click(await t.findByRole('button', { name: `Revocar ${name}` }))
    return within(screen.getByRole('alertdialog', { name: `¿Revocar la clave «${name}»?` }))
  }

  it('revokes after confirming and hides the key from the active list', async () => {
    const user = userEvent.setup()
    renderApp('/admin/claves', { session: admin })
    const dialog = await openRevoke(user, 'ERP contable')
    await user.click(dialog.getByRole('button', { name: 'Revocar clave' }))

    expect(await screen.findByText('Clave revocada correctamente.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('cell', { name: 'ERP contable' })).not.toBeInTheDocument())
  })

  it('informs and refreshes when the key no longer exists (404)', async () => {
    const user = userEvent.setup()
    renderApp('/admin/claves', { session: admin })
    const dialog = await openRevoke(user, 'ERP contable')
    keys = keys.filter((k) => k.summary.id !== 'k1')
    await user.click(dialog.getByRole('button', { name: 'Revocar clave' }))

    expect(await screen.findByText('La clave de API indicada no existe.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('cell', { name: 'ERP contable' })).not.toBeInTheDocument())
  })

  it('keeps the dialog open with the error on a 500', async () => {
    server.use(
      http.delete(`${API}/admin/api-keys/:id`, () =>
        HttpResponse.json({ userMessage: 'Ocurrió un error al revocar la clave de API.', technicalError: 'db down' }, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderApp('/admin/claves', { session: admin })
    const dialog = await openRevoke(user, 'ERP contable')
    await user.click(dialog.getByRole('button', { name: 'Revocar clave' }))
    expect(await dialog.findByText('Ocurrió un error al revocar la clave de API.')).toBeInTheDocument()
  })
})

describe('Criterio de aceptación', () => {
  it('a key created in the UI logs in as a client limited to its accounts, and is sent back to Acceso once revoked', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const { unmount } = renderApp('/admin/claves', { session: admin })
    await createKey(user)
    const reveal = within(await screen.findByRole('dialog', { name: 'Clave creada' }))
    await user.click(reveal.getByRole('button', { name: 'Copiar clave' }))
    await user.click(reveal.getByRole('button', { name: 'Listo' }))
    unmount()
    window.sessionStorage.clear()

    // Entra con la clave nueva: rol cliente y solo la cuenta permitida.
    const client = renderApp('/acceso')
    await user.type(await screen.findByLabelText('Clave de API'), NEW_KEY)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await screen.findByRole('heading', { name: 'Facturas recibidas' })
    expect(screen.queryByRole('link', { name: 'Claves de API' })).not.toBeInTheDocument()
    const selector = screen.getByRole('combobox', { name: 'Cuenta de Gmail activa' })
    await waitFor(() => expect(selector).toHaveValue('pagos@empresa.com'))
    expect(within(selector).getAllByRole('option')).toHaveLength(1)
    client.unmount()

    // El administrador la revoca; la sesión del cliente vuelve a Acceso en su siguiente petición.
    keys.find((k) => k.secret === NEW_KEY).summary.revokedAt = '2026-10-12T10:00:00.000Z'
    renderApp('/cuentas', { session: { apiKey: NEW_KEY, role: 'client' } })
    expect(await screen.findByText('Su clave de API no es válida o fue revocada.')).toBeInTheDocument()
    expect(getApiKey()).toBeNull()
  })
})
