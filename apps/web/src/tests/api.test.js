import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import api, { setApiEventHandlers } from '../api/axios.js'
import { ApiError, NETWORK_MESSAGE, normalizeError } from '../api/errors.js'
import { saveSession } from '../lib/storage.js'
import { API, CLIENT_KEY, server } from './msw/server.js'

describe('normalizeError', () => {
  it('keeps the API userMessage and technicalError', () => {
    const err = normalizeError({
      message: 'Request failed with status code 404',
      response: { status: 404, data: { userMessage: 'Cuenta no conectada.', technicalError: 'AccountNotFoundError' }, headers: {} },
    })
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 404, code: 'http', userMessage: 'Cuenta no conectada.', technicalError: 'AccountNotFoundError' })
  })

  it('falls back to a Spanish message when the body is not the API shape', () => {
    const err = normalizeError({ message: 'Bad Gateway', response: { status: 500, data: '<html>', headers: {} } })
    expect(err.userMessage).toBe('Ocurrió un error en el servicio.')
    expect(err.technicalError).toContain('500')
  })

  it('reads Retry-After on 429', () => {
    const err = normalizeError({ response: { status: 429, data: {}, headers: { 'retry-after': '42' } } })
    expect(err.retryAfter).toBe(42)
  })

  it('distinguishes network errors, timeouts and cancellations', () => {
    expect(normalizeError({ code: 'ERR_NETWORK', message: 'Network Error' })).toMatchObject({ status: 0, code: 'network', userMessage: NETWORK_MESSAGE })
    expect(normalizeError({ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' }).code).toBe('timeout')
    expect(normalizeError({ code: 'ERR_CANCELED', name: 'CanceledError' }).code).toBe('canceled')
  })
})

describe('api client', () => {
  afterEach(() => setApiEventHandlers({}))

  it('sends the session key in x-api-key', async () => {
    saveSession({ apiKey: CLIENT_KEY, role: 'client' })
    let received
    server.use(
      http.get(`${API}/accounts`, ({ request }) => {
        received = request.headers.get('x-api-key')
        return HttpResponse.json({ accounts: [], count: 0 })
      }),
    )
    await api.get('/accounts')
    expect(received).toBe(CLIENT_KEY)
  })

  it('rejects with ApiError and notifies 401 and 503 handlers', async () => {
    const onUnauthorized = vi.fn()
    const onUnavailable = vi.fn()
    setApiEventHandlers({ onUnauthorized, onUnavailable })

    await expect(api.get('/accounts')).rejects.toMatchObject({ status: 401, userMessage: 'No autorizado.' })
    expect(onUnauthorized).toHaveBeenCalledOnce()

    server.use(http.get(`${API}/accounts`, () => HttpResponse.json({ userMessage: 'Servicio no disponible.' }, { status: 503 })))
    await expect(api.get('/accounts')).rejects.toBeInstanceOf(ApiError)
    expect(onUnavailable).toHaveBeenCalledOnce()
  })

  it('skips the global handlers when skipSessionHandling is set', async () => {
    const onUnauthorized = vi.fn()
    setApiEventHandlers({ onUnauthorized })
    await expect(api.get('/accounts', { skipSessionHandling: true })).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('maps an unreachable server to the network message', async () => {
    server.use(http.get(`${API}/health`, () => HttpResponse.error()))
    await expect(api.get('/health')).rejects.toMatchObject({ status: 0, code: 'network' })
  })
})
