import request from 'supertest';
import app from '../index.js';

const mockScan = jest.fn();
const mockGetAuthorizedClient = jest.fn();
const mockListAccounts = jest.fn();
const mockDeleteAccount = jest.fn();
const mockVerifyKey = jest.fn();
const mockCreateKey = jest.fn();
const mockListKeys = jest.fn();
const mockRevokeKey = jest.fn();
const mockAuditCreate = jest.fn();

jest.mock('../scanner.service.js', () => ({
  ScannerService: jest.fn().mockImplementation(() => ({
    scan: (...args: any[]) => mockScan(...args),
    scanSent: jest.fn(),
    downloadInvoicePDF: jest.fn(),
  })),
}));

jest.mock('../accounts.service.js', () => {
  const actual = jest.requireActual('../accounts.service.js');
  return {
    ...actual,
    AccountsService: jest.fn().mockImplementation(() => ({
      getAuthorizedClient: (...args: any[]) => mockGetAuthorizedClient(...args),
      listAccounts: (...args: any[]) => mockListAccounts(...args),
      deleteAccount: (...args: any[]) => mockDeleteAccount(...args),
      getAuthUrl: () => 'https://accounts.google.com/mock',
      handleCallback: jest.fn().mockResolvedValue('<img src=x onerror=alert(1)>@empresa.com'),
    })),
  };
});

jest.mock('../api-keys.service.js', () => {
  const actual = jest.requireActual('../api-keys.service.js');
  return {
    ...actual,
    ApiKeysService: jest.fn().mockImplementation(() => ({
      verifyKey: (...args: any[]) => mockVerifyKey(...args),
      createKey: (...args: any[]) => mockCreateKey(...args),
      listKeys: (...args: any[]) => mockListKeys(...args),
      revokeKey: (...args: any[]) => mockRevokeKey(...args),
    })),
  };
});

jest.mock('../prisma.js', () => ({
  prisma: { auditLog: { create: (...args: any[]) => mockAuditCreate(...args) } },
}));

const scoped = { id: 'key-1', name: 'cliente-a', allowedAccounts: ['a@empresa.com'] };
const unscoped = { id: 'key-2', name: 'cliente-b', allowedAccounts: [] };

describe('Authentication and security hardening', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    [mockScan, mockGetAuthorizedClient, mockListAccounts, mockDeleteAccount, mockVerifyKey, mockCreateKey, mockListKeys, mockRevokeKey, mockAuditCreate].forEach((m) => m.mockReset());
    mockScan.mockResolvedValue({ facturas: [], fallidas: [], truncated: false });
    mockGetAuthorizedClient.mockResolvedValue({});
    mockAuditCreate.mockResolvedValue({});
    mockVerifyKey.mockResolvedValue(null);
    process.env = { ...originalEnv, SERVICE_API_KEY: 'master-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const scan = (key: string | undefined, body: any) => {
    const req = request(app).post('/scan');
    if (key) req.set('x-api-key', key);
    return req.send(body);
  };

  describe('API keys', () => {
    test('rejects an unknown or revoked key with 401', async () => {
      const response = await scan('sfg_unknown', { accountEmail: 'a@empresa.com', sinceDate: '2026-06-01' });
      expect(response.status).toBe(401);
      expect(mockVerifyKey).toHaveBeenCalledWith('sfg_unknown');
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('no longer accepts the key in the apiKey query parameter', async () => {
      const response = await request(app)
        .post('/scan?apiKey=master-key')
        .send({ accountEmail: 'a@empresa.com', sinceDate: '2026-06-01' });
      expect(response.status).toBe(401);
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('a valid per-client key can scan an unrestricted account', async () => {
      mockVerifyKey.mockResolvedValue(unscoped);
      const response = await scan('sfg_ok', { accountEmail: 'any@empresa.com', sinceDate: '2026-06-01', supplierEmails: ['p@x.com'] });
      expect(response.status).toBe(200);
    });

    test('returns 500 with the standard shape if key verification fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockVerifyKey.mockRejectedValue(new Error('db down'));
      const response = await scan('sfg_ok', { accountEmail: 'a@empresa.com' });
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('userMessage');
      // Unauthenticated caller: internal error details must not leak.
      expect(response.body.technicalError).toBe('API key verification failed');
      expect(JSON.stringify(response.body)).not.toContain('db down');
      errorSpy.mockRestore();
    });
  });

  describe('account scope', () => {
    const body = { sinceDate: '2026-06-01', supplierEmails: ['p@x.com'] };

    test('a restricted key is rejected for other accounts with 403', async () => {
      mockVerifyKey.mockResolvedValue(scoped);
      const response = await scan('sfg_scoped', { ...body, accountEmail: 'other@empresa.com' });
      expect(response.status).toBe(403);
      expect(mockGetAuthorizedClient).not.toHaveBeenCalled();
    });

    test('a restricted key is accepted for its own account (case-insensitive)', async () => {
      mockVerifyKey.mockResolvedValue(scoped);
      const response = await scan('sfg_scoped', { ...body, accountEmail: 'A@Empresa.com' });
      expect(response.status).toBe(200);
    });

    test('a restricted key cannot bypass the scope with a non-string accountEmail', async () => {
      mockVerifyKey.mockResolvedValue(scoped);
      const response = await scan('sfg_scoped', { ...body, accountEmail: ['a@empresa.com'] });
      expect(response.status).toBe(403);
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('a restricted key only sees its own accounts in GET /accounts', async () => {
      mockVerifyKey.mockResolvedValue(scoped);
      mockListAccounts.mockResolvedValue([
        { email: 'a@empresa.com', connectedAt: new Date(), updatedAt: new Date() },
        { email: 'b@empresa.com', connectedAt: new Date(), updatedAt: new Date() },
      ]);
      const response = await request(app).get('/accounts').set('x-api-key', 'sfg_scoped');
      expect(response.status).toBe(200);
      expect(response.body.accounts.map((a: any) => a.email)).toEqual(['a@empresa.com']);
    });

    test('the master key sees every account', async () => {
      mockListAccounts.mockResolvedValue([
        { email: 'a@empresa.com', connectedAt: new Date(), updatedAt: new Date() },
        { email: 'b@empresa.com', connectedAt: new Date(), updatedAt: new Date() },
      ]);
      const response = await request(app).get('/accounts').set('x-api-key', 'master-key');
      expect(response.body.count).toBe(2);
    });
  });

  describe('admin-only routes', () => {
    test.each([
      ['get', '/auth/google/login'],
      ['delete', '/accounts/a@empresa.com'],
      ['get', '/admin/api-keys'],
      ['post', '/admin/api-keys'],
      ['delete', '/admin/api-keys/key-1'],
    ])('%s %s returns 403 for a per-client key', async (method, path) => {
      mockVerifyKey.mockResolvedValue(unscoped);
      const response = await (request(app) as any)[method](path).set('x-api-key', 'sfg_ok').send({ name: 'x' });
      expect(response.status).toBe(403);
      expect(mockDeleteAccount).not.toHaveBeenCalled();
      expect(mockCreateKey).not.toHaveBeenCalled();
    });

    test('POST /admin/api-keys creates a key with the master key', async () => {
      mockCreateKey.mockResolvedValue({ key: 'sfg_plain', summary: { id: 'k1', name: 'cliente-a' } });
      const response = await request(app)
        .post('/admin/api-keys')
        .set('x-api-key', 'master-key')
        .send({ name: 'cliente-a', allowedAccounts: ['a@empresa.com'] });
      expect(response.status).toBe(201);
      expect(response.body.key).toBe('sfg_plain');
      expect(mockCreateKey).toHaveBeenCalledWith('cliente-a', ['a@empresa.com']);
    });

    test('POST /admin/api-keys validates the body', async () => {
      const response = await request(app)
        .post('/admin/api-keys')
        .set('x-api-key', 'master-key')
        .send({ name: '', allowedAccounts: ['not-an-email'] });
      expect(response.status).toBe(400);
      expect(mockCreateKey).not.toHaveBeenCalled();
    });

    test('DELETE /admin/api-keys/:id revokes and maps a missing key to 404', async () => {
      const { ApiKeyNotFoundError } = jest.requireActual('../api-keys.service.js');
      mockRevokeKey.mockResolvedValueOnce(undefined);
      expect((await request(app).delete('/admin/api-keys/k1').set('x-api-key', 'master-key')).status).toBe(200);

      mockRevokeKey.mockRejectedValueOnce(new ApiKeyNotFoundError('nope'));
      expect((await request(app).delete('/admin/api-keys/nope').set('x-api-key', 'master-key')).status).toBe(404);
    });

    test('GET /admin/api-keys lists keys', async () => {
      mockListKeys.mockResolvedValue([{ id: 'k1', name: 'cliente-a', keyPrefix: 'sfg_abcd' }]);
      const response = await request(app).get('/admin/api-keys').set('x-api-key', 'master-key');
      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toMatch(/keyHash/);
    });
  });

  describe('input validation', () => {
    test.each([
      ['accountEmail is not an email', { accountEmail: 'nope', sinceDate: '2026-06-01' }],
      ['sinceDate is not a date', { accountEmail: 'a@empresa.com', sinceDate: 'ayer' }],
      ['supplierEmails contains an invalid email', { accountEmail: 'a@empresa.com', sinceDate: '2026-06-01', supplierEmails: ['ok@x.com', 'bad'] }],
      ['q is too long', { accountEmail: 'a@empresa.com', q: 'x'.repeat(1001) }],
    ])('returns 400 when %s', async (_label, body) => {
      const response = await scan('master-key', body);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('userMessage');
      expect(response.body.technicalError).toContain('Invalid request');
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('malformed JSON returns a JSON 400 instead of an HTML stack trace', async () => {
      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'master-key')
        .set('Content-Type', 'application/json')
        .send('{"accountEmail":');
      expect(response.status).toBe(400);
      expect(response.body.technicalError).toBe('entity.parse.failed');
    });
  });

  describe('headers', () => {
    test('sets Helmet security headers', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('does not allow cross-origin requests by default', async () => {
      const response = await request(app).get('/health').set('Origin', 'https://evil.example');
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('audit log', () => {
    test('records key, route, account and status without the body or the key', async () => {
      mockVerifyKey.mockResolvedValue(unscoped);
      await scan('sfg_secret_value', {
        accountEmail: 'a@empresa.com',
        sinceDate: '2026-06-01',
        supplierEmails: ['p@x.com'],
        geminiApiKey: 'gemini-secret',
      });
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockAuditCreate).toHaveBeenCalledTimes(1);
      const { data } = mockAuditCreate.mock.calls[0][0];
      expect(data).toMatchObject({ apiKeyId: 'key-2', action: 'POST /scan', accountEmail: 'a@empresa.com', statusCode: 200 });
      const serialized = JSON.stringify(data);
      expect(serialized).not.toContain('sfg_secret_value');
      expect(serialized).not.toContain('gemini-secret');
    });

    test('logs the master key as apiKeyId null', async () => {
      await scan('master-key', { accountEmail: 'a@empresa.com', sinceDate: '2026-06-01', supplierEmails: ['p@x.com'] });
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockAuditCreate.mock.calls[0][0].data.apiKeyId).toBeNull();
    });

    test('a failing audit write does not break the response', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockAuditCreate.mockRejectedValue(new Error('db down'));
      const response = await scan('master-key', { accountEmail: 'a@empresa.com', sinceDate: '2026-06-01', supplierEmails: ['p@x.com'] });
      expect(response.status).toBe(200);
      errorSpy.mockRestore();
    });

    test('unauthenticated requests are not audited', async () => {
      await scan(undefined, { accountEmail: 'a@empresa.com' });
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockAuditCreate).not.toHaveBeenCalled();
    });
  });

  describe('OAuth callback HTML', () => {
    test('escapes the account email in the rendered page', async () => {
      const response = await request(app).get('/auth/google/callback?code=abc&state=xyz');
      expect(response.status).toBe(200);
      expect(response.text).not.toContain('<img');
      expect(response.text).toContain('&lt;img');
    });
  });
});
