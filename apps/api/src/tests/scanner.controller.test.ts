import request from 'supertest';
import app from '../index.js';
import { AccountNotFoundError } from '../accounts.service.js';

const mockScan = jest.fn();
const mockScanSent = jest.fn();
const mockDownloadInvoicePDF = jest.fn();
const mockGetAuthorizedClient = jest.fn();

jest.mock('../scanner.service.js', () => {
  return {
    ScannerService: jest.fn().mockImplementation(() => {
      return {
        scan: (...args: any[]) => mockScan(...args),
        scanSent: (...args: any[]) => mockScanSent(...args),
        downloadInvoicePDF: (...args: any[]) => mockDownloadInvoicePDF(...args),
      };
    }),
  };
});

jest.mock('../accounts.service.js', () => {
  const actual = jest.requireActual('../accounts.service.js');
  return {
    ...actual,
    AccountsService: jest.fn().mockImplementation(() => ({
      getAuthorizedClient: (...args: any[]) => mockGetAuthorizedClient(...args),
    })),
  };
});

const mockVerifyKey = jest.fn();
jest.mock('../api-keys.service.js', () => {
  const actual = jest.requireActual('../api-keys.service.js');
  return {
    ...actual,
    ApiKeysService: jest.fn().mockImplementation(() => ({
      verifyKey: (...args: any[]) => mockVerifyKey(...args),
    })),
  };
});

jest.mock('../prisma.js', () => ({
  prisma: { auditLog: { create: jest.fn().mockResolvedValue({}) } },
}));

describe('ScannerController Integration Tests', () => {
  const originalEnv = process.env;
  const fakeAuthClient = { fake: 'oauth2-client' };

  beforeEach(() => {
    mockVerifyKey.mockReset();
    mockVerifyKey.mockResolvedValue(null);
    mockScan.mockReset();
    mockScanSent.mockReset();
    mockDownloadInvoicePDF.mockReset();
    mockGetAuthorizedClient.mockReset();
    mockGetAuthorizedClient.mockResolvedValue(fakeAuthClient);
    // Setup environmental variables including test API Key
    process.env = {
      ...originalEnv,
      SERVICE_API_KEY: 'test-api-key',
      GOOGLE_CLIENT_ID: 'env-client-id',
      GOOGLE_CLIENT_SECRET: 'env-client-secret',
      GEMINI_API_KEY: 'env-gemini-key',
      SUPPLIER_EMAILS: 'default1@test.com,default2@test.com',
      CLIENT_EMAILS: 'clientdefault1@test.com,clientdefault2@test.com',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('GET /health', () => {
    test('should return 200 OK with service details without requiring API Key', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'gmail-scanner-service',
      });
    });
  });

  describe('POST /scan', () => {
    test('should return 401 Unauthorized if API Key is missing or invalid', async () => {
      const response = await request(app)
        .post('/scan')
        .send({ accountEmail: 'compras@empresa.com' });

      expect(response.status).toBe(401);
      expect(response.body.userMessage).toContain('No autorizado');
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('should return 503 Service Unavailable if SERVICE_API_KEY is not configured', async () => {
      delete process.env.SERVICE_API_KEY;
      const response = await request(app)
        .post('/scan')
        .send({ accountEmail: 'compras@empresa.com' });

      expect(response.status).toBe(503);
      expect(response.body.userMessage).toContain('Servicio no disponible temporalmente');
      expect(response.body.technicalError).toContain('SERVICE_API_KEY is not configured');
    });

    test('should return 400 Bad Request if accountEmail is missing', async () => {
      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .send({ sinceDate: '2026-06-01T00:00:00.000Z' });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Cuenta de Gmail no especificada.');
      expect(response.body.technicalError).toContain('Missing required parameter: accountEmail');
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('should return 400 Bad Request if sinceDate is missing', async () => {
      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .send({ accountEmail: 'compras@empresa.com' });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Fecha de inicio (sinceDate) no proporcionada.');
      expect(response.body.technicalError).toContain('Missing required parameter: sinceDate is mandatory');
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('should return 404 if the requested Gmail account is not connected', async () => {
      mockGetAuthorizedClient.mockRejectedValue(new AccountNotFoundError('compras@empresa.com'));

      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .send({ accountEmail: 'compras@empresa.com', sinceDate: '2026-06-01T00:00:00.000Z' });

      expect(response.status).toBe(404);
      expect(response.body.userMessage).toContain('/auth/google/login');
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('should return 400 Bad Request if supplierEmails is present but not an array', async () => {
      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .send({
          accountEmail: 'compras@empresa.com',
          sinceDate: '2026-06-01T00:00:00.000Z',
          supplierEmails: 'not-an-array',
        });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Lista de correos de proveedores no válida.');
      expect(response.body.technicalError).toContain('Invalid parameter: supplierEmails must be an array of strings');
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('should fallback to default env supplierEmails split when omitted in body', async () => {
      mockScan.mockResolvedValue({ facturas: [], fallidas: [], truncated: false });
      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .send({ accountEmail: 'compras@empresa.com', sinceDate: '2026-06-01T00:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(mockScan).toHaveBeenCalledWith(expect.objectContaining({
        supplierEmails: ['default1@test.com', 'default2@test.com'],
      }));
    });

    test('should call ScannerService.scan with the authorized client and return 200 with { facturas, count }', async () => {
      const mockResult = [
        {
          supplierRuc: '12345678-9',
          supplierName: 'Test Supplier',
          total: 100,
          items: [],
        },
      ];

      mockScan.mockResolvedValue({ facturas: mockResult, fallidas: [], truncated: false });

      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .send({
          accountEmail: 'compras@empresa.com',
          supplierEmails: ['supplier@test.com'],
          sinceDate: '2026-06-01T00:00:00.000Z',
          geminiApiKey: 'mock-gemini-key',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        facturas: mockResult,
        count: mockResult.length,
        fallidas: [],
        truncated: false,
      });
      expect(mockGetAuthorizedClient).toHaveBeenCalledWith('compras@empresa.com');
      expect(mockScan).toHaveBeenCalledWith({
        authClient: fakeAuthClient,
        supplierEmails: ['supplier@test.com'],
        sinceDate: '2026-06-01T00:00:00.000Z',
        geminiApiKey: 'mock-gemini-key',
        q: undefined,
      });
    });

    test('should return 500 Internal Server Error if ScannerService throws an error', async () => {
      mockScan.mockRejectedValue(new Error('Gmail API Limit Exceeded'));

      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .send({
          accountEmail: 'compras@empresa.com',
          supplierEmails: ['supplier@test.com'],
          sinceDate: '2026-06-01T00:00:00.000Z',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        userMessage: 'Ocurrió un error al escanear la bandeja de entrada. Por favor, intente de nuevo más tarde.',
        technicalError: 'Gmail API Limit Exceeded',
      });
    });
  });

  describe('POST /scan-sent', () => {
    test('should return 401 Unauthorized if API Key is missing or invalid', async () => {
      const response = await request(app)
        .post('/scan-sent')
        .send({ accountEmail: 'compras@empresa.com' });

      expect(response.status).toBe(401);
      expect(response.body.userMessage).toContain('No autorizado');
      expect(mockScanSent).not.toHaveBeenCalled();
    });

    test('should return 503 Service Unavailable if SERVICE_API_KEY is not configured', async () => {
      delete process.env.SERVICE_API_KEY;
      const response = await request(app)
        .post('/scan-sent')
        .send({ accountEmail: 'compras@empresa.com' });

      expect(response.status).toBe(503);
      expect(response.body.userMessage).toContain('Servicio no disponible temporalmente');
    });

    test('should return 400 Bad Request if accountEmail is missing', async () => {
      const response = await request(app)
        .post('/scan-sent')
        .set('x-api-key', 'test-api-key')
        .send({ sinceDate: '2026-06-01T00:00:00.000Z' });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Cuenta de Gmail no especificada.');
      expect(mockScanSent).not.toHaveBeenCalled();
    });

    test('should return 400 Bad Request if sinceDate is missing', async () => {
      const response = await request(app)
        .post('/scan-sent')
        .set('x-api-key', 'test-api-key')
        .send({ accountEmail: 'ventas@empresa.com' });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Fecha de inicio (sinceDate) no proporcionada.');
      expect(mockScanSent).not.toHaveBeenCalled();
    });

    test('should return 400 Bad Request if clientEmails is present but not an array', async () => {
      const response = await request(app)
        .post('/scan-sent')
        .set('x-api-key', 'test-api-key')
        .send({
          accountEmail: 'ventas@empresa.com',
          sinceDate: '2026-06-01T00:00:00.000Z',
          clientEmails: 'not-an-array',
        });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Lista de correos de clientes no válida.');
      expect(mockScanSent).not.toHaveBeenCalled();
    });

    test('should return 400 Bad Request if clientEmails is missing and CLIENT_EMAILS env is not set', async () => {
      delete process.env.CLIENT_EMAILS;
      const response = await request(app)
        .post('/scan-sent')
        .set('x-api-key', 'test-api-key')
        .send({ accountEmail: 'ventas@empresa.com', sinceDate: '2026-06-01T00:00:00.000Z' });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Lista de correos de clientes no proporcionada.');
      expect(mockScanSent).not.toHaveBeenCalled();
    });

    test('should fallback to default env clientEmails split when omitted in body', async () => {
      mockScanSent.mockResolvedValue({ facturas: [], fallidas: [], truncated: false });
      const response = await request(app)
        .post('/scan-sent')
        .set('x-api-key', 'test-api-key')
        .send({ accountEmail: 'ventas@empresa.com', sinceDate: '2026-06-01T00:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(mockScanSent).toHaveBeenCalledWith(expect.objectContaining({
        clientEmails: ['clientdefault1@test.com', 'clientdefault2@test.com'],
      }));
    });

    test('should return 404 if the requested Gmail account is not connected', async () => {
      mockGetAuthorizedClient.mockRejectedValue(new AccountNotFoundError('ventas@empresa.com'));

      const response = await request(app)
        .post('/scan-sent')
        .set('x-api-key', 'test-api-key')
        .send({ accountEmail: 'ventas@empresa.com', sinceDate: '2026-06-01T00:00:00.000Z' });

      expect(response.status).toBe(404);
      expect(response.body.userMessage).toContain('/auth/google/login');
      expect(mockScanSent).not.toHaveBeenCalled();
    });

    test('should call ScannerService.scanSent with the authorized client and return 200 with { facturas, count }', async () => {
      const mockResult = [
        {
          supplierName: 'Mi Empresa',
          recipientEmail: 'cliente@test.com',
          total: 100,
          items: [],
        },
      ];

      mockScanSent.mockResolvedValue({ facturas: mockResult, fallidas: [], truncated: false });

      const response = await request(app)
        .post('/scan-sent')
        .set('x-api-key', 'test-api-key')
        .send({
          accountEmail: 'ventas@empresa.com',
          clientEmails: ['cliente@test.com'],
          sinceDate: '2026-06-01T00:00:00.000Z',
          geminiApiKey: 'mock-gemini-key',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        facturas: mockResult,
        count: mockResult.length,
        fallidas: [],
        truncated: false,
      });
      expect(mockGetAuthorizedClient).toHaveBeenCalledWith('ventas@empresa.com');
      expect(mockScanSent).toHaveBeenCalledWith({
        authClient: fakeAuthClient,
        clientEmails: ['cliente@test.com'],
        sinceDate: '2026-06-01T00:00:00.000Z',
        geminiApiKey: 'mock-gemini-key',
        q: undefined,
        accountEmail: 'ventas@empresa.com',
      });
    });

    test('should return 500 Internal Server Error if ScannerService throws an error', async () => {
      mockScanSent.mockRejectedValue(new Error('Gmail API Limit Exceeded'));

      const response = await request(app)
        .post('/scan-sent')
        .set('x-api-key', 'test-api-key')
        .send({
          accountEmail: 'ventas@empresa.com',
          clientEmails: ['cliente@test.com'],
          sinceDate: '2026-06-01T00:00:00.000Z',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        userMessage: 'Ocurrió un error al escanear los correos enviados. Por favor, intente de nuevo más tarde.',
        technicalError: 'Gmail API Limit Exceeded',
      });
    });
  });

  describe('GET & POST /download-pdf', () => {
    test('should return 401 Unauthorized if API Key is missing or invalid', async () => {
      const response = await request(app)
        .get('/download-pdf')
        .query({ messageId: 'msg-123', attachmentId: 'att-555' });

      expect(response.status).toBe(401);
      expect(mockDownloadInvoicePDF).not.toHaveBeenCalled();
    });

    test('should return 400 Bad Request if messageId or attachmentId is missing', async () => {
      const response = await request(app)
        .get('/download-pdf')
        .set('x-api-key', 'test-api-key')
        .query({ accountEmail: 'compras@empresa.com' });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Parámetros messageId o attachmentId no proporcionados');
      expect(mockDownloadInvoicePDF).not.toHaveBeenCalled();
    });

    test('should return 400 Bad Request if accountEmail is missing', async () => {
      const response = await request(app)
        .get('/download-pdf')
        .set('x-api-key', 'test-api-key')
        .query({ messageId: 'msg-123', attachmentId: 'att-555' });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Cuenta de Gmail no especificada.');
      expect(mockDownloadInvoicePDF).not.toHaveBeenCalled();
    });

    test('should return 404 if the requested Gmail account is not connected', async () => {
      mockGetAuthorizedClient.mockRejectedValue(new AccountNotFoundError('compras@empresa.com'));

      const response = await request(app)
        .get('/download-pdf')
        .set('x-api-key', 'test-api-key')
        .query({ messageId: 'msg-123', attachmentId: 'att-555', accountEmail: 'compras@empresa.com' });

      expect(response.status).toBe(404);
      expect(mockDownloadInvoicePDF).not.toHaveBeenCalled();
    });

    test('should return 200 and file buffer when download is successful (GET with query)', async () => {
      mockDownloadInvoicePDF.mockResolvedValue({
        filename: 'factura.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('pdf-data'),
      });

      const response = await request(app)
        .get('/download-pdf')
        .set('x-api-key', 'test-api-key')
        .query({
          messageId: 'msg-123',
          attachmentId: 'att-555',
          accountEmail: 'compras@empresa.com',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toBe('attachment; filename="factura.pdf"');
      expect(response.body).toEqual(Buffer.from('pdf-data'));
      expect(mockGetAuthorizedClient).toHaveBeenCalledWith('compras@empresa.com');
      expect(mockDownloadInvoicePDF).toHaveBeenCalledWith({
        gmailMessageId: 'msg-123',
        gmailAttachmentId: 'att-555',
        authClient: fakeAuthClient,
        targetPdfFilename: undefined,
      });
    });

    test('should return 200 and file buffer when download is successful (POST with body)', async () => {
      mockDownloadInvoicePDF.mockResolvedValue({
        filename: 'extracted.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('extracted-pdf-data'),
      });

      const response = await request(app)
        .post('/download-pdf')
        .set('x-api-key', 'test-api-key')
        .send({
          messageId: 'msg-123',
          attachmentId: 'att-555',
          accountEmail: 'compras@empresa.com',
          filename: 'custom.pdf',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toBe('attachment; filename="extracted.pdf"');
      expect(response.body).toEqual(Buffer.from('extracted-pdf-data'));
      expect(mockDownloadInvoicePDF).toHaveBeenCalledWith({
        gmailMessageId: 'msg-123',
        gmailAttachmentId: 'att-555',
        authClient: fakeAuthClient,
        targetPdfFilename: 'custom.pdf',
      });
    });
  });
});
