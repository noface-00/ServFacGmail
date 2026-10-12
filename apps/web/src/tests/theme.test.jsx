import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { CLIENT_KEY } from './msw/server.js'
import { renderApp } from './renderApp.jsx'

afterEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('Tema', () => {
  it('cycles system → light → dark → system and remembers the choice', async () => {
    const user = userEvent.setup()
    renderApp('/escanear/recibidas', { session: { apiKey: CLIENT_KEY, role: 'client' } })

    await user.click(await screen.findByRole('button', { name: /Tema del sistema/ }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem('sf.theme')).toBe('light')

    await user.click(screen.getByRole('button', { name: /Tema claro/ }))
    expect(document.documentElement.dataset.theme).toBe('dark')

    await user.click(screen.getByRole('button', { name: /Tema oscuro/ }))
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(window.localStorage.getItem('sf.theme')).toBeNull()
  })

  it('starts from the stored theme, also on the login screen', async () => {
    window.localStorage.setItem('sf.theme', 'dark')
    renderApp('/acceso')
    expect(await screen.findByRole('button', { name: /Tema oscuro/ })).toBeInTheDocument()
  })
})
