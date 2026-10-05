import request from 'supertest';

// The limiters read their limits from the env when they are built, so set it before loading the app.
process.env.RATE_LIMIT_SCAN = '2';
process.env.SERVICE_API_KEY = 'master-key';

jest.mock('../prisma.js', () => ({
  prisma: { auditLog: { create: jest.fn().mockResolvedValue({}) } },
}));
jest.mock('../scanner.service.js', () => ({
  ScannerService: jest.fn().mockImplementation(() => ({
    scan: jest.fn().mockResolvedValue({ facturas: [], fallidas: [], truncated: false }),
  })),
}));
jest.mock('../accounts.service.js', () => ({
  ...jest.requireActual('../accounts.service.js'),
  AccountsService: jest.fn().mockImplementation(() => ({ getAuthorizedClient: jest.fn().mockResolvedValue({}) })),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../index.js').default;

describe('Rate limiting', () => {
  const body = { accountEmail: 'a@empresa.com', sinceDate: '2026-06-01', supplierEmails: ['p@x.com'] };

  test('returns 429 in the standard error shape once the scan limit is exceeded', async () => {
    const send = () => request(app).post('/scan').set('x-api-key', 'master-key').send(body);

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    const limited = await send();

    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({
      userMessage: expect.any(String),
      technicalError: 'Rate limit exceeded',
    });
  });

  test('never rate limits /health', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await request(app).get('/health')).status).toBe(200);
    }
  });
});
