import request from 'supertest';
import app from '../index.js';

const mockScan = jest.fn();
const mockDownloadInvoicePDF = jest.fn();

jest.mock('../scanner.service.js', () => {
  return {
    ScannerService: jest.fn().mockImplementation(() => {
      return {
        scan: (...args: any[]) => mockScan(...args),
        downloadInvoicePDF: (...args: any[]) => mockDownloadInvoicePDF(...args),
      };
    }),
  };
});

describe('ScannerController Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockScan.mockReset();
    mockDownloadInvoicePDF.mockReset();
    // Setup environmental variables including test API Key
    process.env = {
      ...originalEnv,
      SERVICE_API_KEY: 'test-api-key',
      GOOGLE_CLIENT_ID: 'env-client-id',
      GOOGLE_CLIENT_SECRET: 'env-client-secret',
      GEMINI_API_KEY: 'env-gemini-key',
      SUPPLIER_EMAILS: 'default1@test.com,default2@test.com',
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
        .send({
          accessToken: 'mock-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.userMessage).toContain('No autorizado');
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('should return 503 Service Unavailable if SERVICE_API_KEY is not configured', async () => {
      delete process.env.SERVICE_API_KEY;
      const response = await request(app)
        .post('/scan')
        .send({
          accessToken: 'mock-token',
        });

      expect(response.status).toBe(503);
      expect(response.body.userMessage).toContain('Servicio no disponible temporalmente');
      expect(response.body.technicalError).toContain('SERVICE_API_KEY is not configured');
    });

    test('should return 400 Bad Request if accessToken is missing', async () => {
      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .send({
          clientId: 'mock-id',
          clientSecret: 'mock-secret',
          sinceDate: '2026-06-01T00:00:00.000Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Token de acceso no proporcionado.');
      expect(response.body.technicalError).toContain('Missing required parameter: accessToken');
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('should return 400 Bad Request if sinceDate is missing', async () => {
      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .send({
          accessToken: 'mock-token',
          clientId: 'mock-id',
          clientSecret: 'mock-secret',
        });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Fecha de inicio (sinceDate) no proporcionada.');
      expect(response.body.technicalError).toContain('Missing required parameter: sinceDate is mandatory');
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('should accept accessToken from Authorization Header', async () => {
      mockScan.mockResolvedValue({ facturas: [], fallidas: [], truncated: false });
      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .set('Authorization', 'Bearer header-token')
        .send({
          clientId: 'mock-id',
          clientSecret: 'mock-secret',
          sinceDate: '2026-06-01T00:00:00.000Z',
        });

      expect(response.status).toBe(200);
      expect(mockScan).toHaveBeenCalledWith(expect.objectContaining({
        accessToken: 'header-token',
        sinceDate: '2026-06-01T00:00:00.000Z',
      }));
    });

    test('should return 400 Bad Request if clientId is missing in both body and environment', async () => {
      // Temporarily remove environment credentials
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .send({
          accessToken: 'mock-token',
          clientSecret: 'mock-secret',
          sinceDate: '2026-06-01T00:00:00.000Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Credenciales del cliente OAuth');
      expect(response.body.technicalError).toContain('Missing required parameters: clientId or clientSecret');
      expect(mockScan).not.toHaveBeenCalled();
    });

    test('should return 400 Bad Request if supplierEmails is present but not an array', async () => {
      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .send({
          accessToken: 'mock-token',
          clientId: 'mock-id',
          clientSecret: 'mock-secret',
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
        .send({
          accessToken: 'mock-token',
          clientId: 'mock-id',
          clientSecret: 'mock-secret',
          sinceDate: '2026-06-01T00:00:00.000Z',
        });

      expect(response.status).toBe(200);
      expect(mockScan).toHaveBeenCalledWith(expect.objectContaining({
        supplierEmails: ['default1@test.com', 'default2@test.com'],
      }));
    });

    test('should call ScannerService.scan and return 200 with { facturas, count }', async () => {
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
          accessToken: 'mock-token',
          clientId: 'mock-id',
          clientSecret: 'mock-secret',
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
      expect(mockScan).toHaveBeenCalledWith({
        accessToken: 'mock-token',
        clientId: 'mock-id',
        clientSecret: 'mock-secret',
        supplierEmails: ['supplier@test.com'],
        sinceDate: '2026-06-01T00:00:00.000Z',
        geminiApiKey: 'mock-gemini-key',
        refreshToken: undefined,
      });
    });

    test('should return 500 Internal Server Error if ScannerService throws an error', async () => {
      mockScan.mockRejectedValue(new Error('Gmail API Limit Exceeded'));

      const response = await request(app)
        .post('/scan')
        .set('x-api-key', 'test-api-key')
        .send({
          accessToken: 'mock-token',
          clientId: 'mock-id',
          clientSecret: 'mock-secret',
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

  describe('GET & POST /download-pdf', () => {
    test('should return 401 Unauthorized if API Key is missing or invalid', async () => {
      const response = await request(app)
        .get('/download-pdf')
        .query({
          messageId: 'msg-123',
          attachmentId: 'att-555',
        });

      expect(response.status).toBe(401);
      expect(mockDownloadInvoicePDF).not.toHaveBeenCalled();
    });

    test('should return 400 Bad Request if messageId or attachmentId is missing', async () => {
      const response = await request(app)
        .get('/download-pdf')
        .set('x-api-key', 'test-api-key')
        .query({
          accessToken: 'mock-token',
        });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Parámetros messageId o attachmentId no proporcionados');
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
          accessToken: 'mock-token',
          clientId: 'mock-client',
          clientSecret: 'mock-secret',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toBe('attachment; filename="factura.pdf"');
      expect(response.body).toEqual(Buffer.from('pdf-data'));
      expect(mockDownloadInvoicePDF).toHaveBeenCalledWith({
        gmailMessageId: 'msg-123',
        gmailAttachmentId: 'att-555',
        accessToken: 'mock-token',
        clientId: 'mock-client',
        clientSecret: 'mock-secret',
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
          accessToken: 'mock-token',
          clientId: 'mock-client',
          clientSecret: 'mock-secret',
          filename: 'custom.pdf',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toBe('attachment; filename="extracted.pdf"');
      expect(response.body).toEqual(Buffer.from('extracted-pdf-data'));
      expect(mockDownloadInvoicePDF).toHaveBeenCalledWith({
        gmailMessageId: 'msg-123',
        gmailAttachmentId: 'att-555',
        accessToken: 'mock-token',
        clientId: 'mock-client',
        clientSecret: 'mock-secret',
        targetPdfFilename: 'custom.pdf',
      });
    });

    test('should handle authorization header correctly', async () => {
      mockDownloadInvoicePDF.mockResolvedValue({
        filename: 'factura.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('data'),
      });

      const response = await request(app)
        .get('/download-pdf')
        .set('x-api-key', 'test-api-key')
        .set('Authorization', 'Bearer header-token')
        .query({
          messageId: 'msg-123',
          attachmentId: 'att-555',
          clientId: 'mock-client',
          clientSecret: 'mock-secret',
        });

      expect(response.status).toBe(200);
      expect(mockDownloadInvoicePDF).toHaveBeenCalledWith(expect.objectContaining({
        accessToken: 'header-token',
      }));
    });
  });
});
