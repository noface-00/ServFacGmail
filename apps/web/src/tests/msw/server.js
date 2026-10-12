import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const API = 'http://api.test'

export const MASTER_KEY = 'master-key'
export const CLIENT_KEY = 'sfg_client_key'

export const accountsFixture = [
  { email: 'contabilidad@empresa.com', connectedAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-10-10T08:00:00.000Z' },
]

const unauthorized = () =>
  HttpResponse.json(
    { userMessage: 'No autorizado.', technicalError: 'Invalid or missing API key (x-api-key header)' },
    { status: 401 },
  )

const isKnown = (request) => [MASTER_KEY, CLIENT_KEY].includes(request.headers.get('x-api-key'))

/** Handlers por defecto: una clave maestra, una de cliente y cualquier otra inválida. */
export const handlers = [
  http.get(`${API}/health`, () => HttpResponse.json({ status: 'ok', service: 'gmail-scanner-service' })),
  http.get(`${API}/accounts`, ({ request }) => {
    if (!isKnown(request)) return unauthorized()
    return HttpResponse.json({ accounts: accountsFixture, count: accountsFixture.length })
  }),
  http.get(`${API}/admin/api-keys`, ({ request }) => {
    if (!isKnown(request)) return unauthorized()
    if (request.headers.get('x-api-key') !== MASTER_KEY) {
      return HttpResponse.json(
        { userMessage: 'No tiene permisos para realizar esta operación.', technicalError: 'This endpoint requires the master API key' },
        { status: 403 },
      )
    }
    return HttpResponse.json({ apiKeys: [], count: 0 })
  }),
]

export const server = setupServer(...handlers)
