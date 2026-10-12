import { describe, expect, it } from 'vitest'
import { csvCell, toCsv } from '../lib/csv.js'
import { invoiceOrigin, matchesSearch, totalsByCurrency } from '../lib/invoices.js'
import { buildScanPayload, defaultScanForm, mapApiFieldErrors, validateScanForm } from '../lib/scanForm.js'

const form = (overrides) => ({ ...defaultScanForm(), ...overrides })
const ctx = { accountEmail: 'contabilidad@empresa.com', kind: 'received' }

describe('validateScanForm', () => {
  it('requires an account', () => {
    expect(validateScanForm(form({ emails: ['a@x.com'] }), { ...ctx, accountEmail: null })).toHaveProperty('accountEmail')
  })

  it('requires date and at least one valid email in simple mode', () => {
    const errors = validateScanForm(form({ sinceDate: '', emails: [] }), ctx)
    expect(errors).toHaveProperty('sinceDate')
    expect(errors.emails).toContain('proveedores')
    expect(validateScanForm(form({ emails: ['mal'] }), ctx)).toHaveProperty('emails')
    expect(validateScanForm(form({ emails: ['a@x.com'] }), ctx)).toEqual({})
  })

  it('accepts the server default list without emails', () => {
    expect(validateScanForm(form({ useDefaultList: true }), ctx)).toEqual({})
  })

  it('only checks the query in advanced mode, up to 1000 chars', () => {
    expect(validateScanForm(form({ mode: 'advanced', q: '' }), ctx)).toHaveProperty('q')
    expect(validateScanForm(form({ mode: 'advanced', q: 'x'.repeat(1001) }), ctx)).toHaveProperty('q')
    expect(validateScanForm(form({ mode: 'advanced', q: 'from:a@x.com', sinceDate: '' }), ctx)).toEqual({})
  })

  it('names clients for sent scans', () => {
    expect(validateScanForm(form(), { ...ctx, kind: 'sent' }).emails).toContain('clientes')
  })
})

describe('buildScanPayload', () => {
  it('sends date and supplierEmails for received scans', () => {
    expect(buildScanPayload(form({ sinceDate: '2026-09-01', emails: ['a@x.com'] }), ctx)).toEqual({
      accountEmail: 'contabilidad@empresa.com',
      sinceDate: '2026-09-01',
      supplierEmails: ['a@x.com'],
    })
  })

  it('uses clientEmails for sent scans and omits the list with the server default', () => {
    expect(buildScanPayload(form({ emails: ['c@x.com'] }), { ...ctx, kind: 'sent' })).toHaveProperty('clientEmails', ['c@x.com'])
    expect(buildScanPayload(form({ useDefaultList: true, emails: ['c@x.com'] }), ctx)).not.toHaveProperty('supplierEmails')
  })

  it('sends only q (and the Gemini key) in advanced mode', () => {
    expect(buildScanPayload(form({ mode: 'advanced', q: ' from:a@x.com ', emails: ['a@x.com'], geminiApiKey: ' k ' }), ctx)).toEqual({
      accountEmail: 'contabilidad@empresa.com',
      q: 'from:a@x.com',
      geminiApiKey: 'k',
    })
  })
})

describe('mapApiFieldErrors', () => {
  it('maps zod issues from validation.ts', () => {
    expect(mapApiFieldErrors('Invalid request: supplierEmails.0: must be a valid email; sinceDate: must be a valid date')).toEqual({
      emails: expect.any(String),
      sinceDate: expect.any(String),
    })
  })

  it('maps the controller missing-parameter messages', () => {
    expect(mapApiFieldErrors('Missing required parameter: sinceDate is mandatory')).toEqual({ sinceDate: expect.any(String) })
    expect(mapApiFieldErrors('Missing parameter: clientEmails must be provided in the body')).toEqual({ emails: expect.any(String) })
  })
})

describe('invoices', () => {
  it('derives the origin from the file extension', () => {
    expect(invoiceOrigin({ filename: 'FAC-001.XML' })).toBe('xml')
    expect(invoiceOrigin({ filename: 'factura.pdf' })).toBe('pdfAi')
    expect(invoiceOrigin({})).toBe('unknown')
  })

  it('totals by currency, unknown currency as null', () => {
    expect(totalsByCurrency([{ total: 10, moneda: 'USD' }, { total: 5.5, moneda: 'USD' }, { total: 3 }, { moneda: 'PEN' }])).toEqual([
      { currency: 'USD', total: 15.5 },
      { currency: null, total: 3 },
    ])
  })

  it('searches across supplier, RUC, number and the kind-specific email', () => {
    const inv = { supplierName: 'Distribuidora Andina', supplierRuc: '1790012345001', senderEmail: 'f@prov.com', recipientEmail: 'c@cli.com' }
    expect(matchesSearch(inv, 'andina', 'received')).toBe(true)
    expect(matchesSearch(inv, '179001', 'received')).toBe(true)
    expect(matchesSearch(inv, 'c@cli', 'received')).toBe(false)
    expect(matchesSearch(inv, 'c@cli', 'sent')).toBe(true)
  })
})

describe('csv', () => {
  it('escapes separators, quotes and formula prefixes', () => {
    expect(csvCell('a;b')).toBe('"a;b"')
    expect(csvCell('di "hola"')).toBe('"di ""hola"""')
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell(-12.5)).toBe('-12.5')
    expect(csvCell(undefined)).toBe('')
  })

  it('builds a BOM-prefixed CSV with a header row', () => {
    const csv = toCsv([{ n: 'Ñandú S.A.', t: 10 }], [
      { header: 'Proveedor', value: (r) => r.n },
      { header: 'Total', value: (r) => r.t },
    ])
    expect(csv).toBe('﻿Proveedor;Total\r\nÑandú S.A.;10\r\n')
  })
})
