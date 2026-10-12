import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { EmailChipsInput } from '../components/form/EmailChipsInput.jsx'

function Harness({ initial = [], max }) {
  const [emails, setEmails] = useState(initial)
  return (
    <>
      <EmailChipsInput label="Correos de proveedores" value={emails} onChange={setEmails} max={max} />
      <output data-testid="value">{JSON.stringify(emails)}</output>
    </>
  )
}

const value = () => JSON.parse(screen.getByTestId('value').textContent)
const input = () => screen.getByLabelText('Correos de proveedores')

describe('EmailChipsInput', () => {
  it('adds a chip on Enter, lowercased', async () => {
    render(<Harness />)
    await userEvent.type(input(), 'Facturas@Proveedor.com{Enter}')
    expect(value()).toEqual(['facturas@proveedor.com'])
    expect(input()).toHaveValue('')
  })

  it('splits on comma and space and ignores duplicates', async () => {
    render(<Harness initial={['a@x.com']} />)
    await userEvent.type(input(), 'b@x.com,a@x.com c@x.com ')
    expect(value()).toEqual(['a@x.com', 'b@x.com', 'c@x.com'])
  })

  it('adds every address from a multi-line paste', () => {
    render(<Harness />)
    fireEvent.paste(input(), {
      clipboardData: { getData: () => 'uno@x.com\ndos@x.com; tres@x.com' },
    })
    expect(value()).toEqual(['uno@x.com', 'dos@x.com', 'tres@x.com'])
  })

  it('marks invalid addresses and reports them', async () => {
    render(<Harness />)
    await userEvent.type(input(), 'no-es-correo{Enter}')
    expect(value()).toEqual(['no-es-correo'])
    expect(screen.getByTitle('Correo no válido')).toBeInTheDocument()
    expect(screen.getByText('1 correo(s) no válido(s)')).toBeInTheDocument()
  })

  it('removes a chip with its button and the last one with Backspace', async () => {
    render(<Harness initial={['a@x.com', 'b@x.com', 'c@x.com']} />)
    await userEvent.click(screen.getByRole('button', { name: 'Quitar a@x.com' }))
    expect(value()).toEqual(['b@x.com', 'c@x.com'])
    await userEvent.type(input(), '{Backspace}')
    expect(value()).toEqual(['b@x.com'])
  })

  it('blocks input once the limit is reached', async () => {
    render(<Harness initial={['a@x.com']} max={2} />)
    await userEvent.type(input(), 'b@x.com c@x.com{Enter}')
    expect(value()).toEqual(['a@x.com', 'b@x.com'])
    expect(input()).toBeDisabled()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })
})
