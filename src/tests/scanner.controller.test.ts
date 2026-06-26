import request from 'supertest';
import app from '../index.js';

const mockScanInbox = jest.fn();

jest.mock('../scanner.service.js', () => {
  return {
    ScannerService: jest.fn().mockImplementation(() => {
      return {
        scanInbox: (...args: any[]) => mockScanInbox(...args),
      };
    }),
  };
});

describe('ScannerController Integration Tests', () => {
  beforeEach(() => {
    mockScanInbox.mockReset();
  });

  describe('GET /health', () => {
    test('should return 200 OK with service details', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'gmail-scanner-service',
      });
    });
  });

  describe('POST /scan', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
      // Delete environmental client credentials to test validation
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('should return 400 Bad Request if accessToken is missing', async () => {
      const response = await request(app)
        .post('/scan')
        .send({
          clientId: 'mock-id',
          clientSecret: 'mock-secret',
          supplierEmails: ['supplier@test.com'],
        });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Token de acceso no proporcionado.');
      expect(response.body.technicalError).toContain('Missing required parameter: accessToken');
      expect(mockScanInbox).not.toHaveBeenCalled();
    });

    test('should accept accessToken from Authorization Header', async () => {
      mockScanInbox.mockResolvedValue([]);
      const response = await request(app)
        .post('/scan')
        .set('Authorization', 'Bearer header-token')
        .send({
          clientId: 'mock-id',
          clientSecret: 'mock-secret',
          supplierEmails: ['supplier@test.com'],
        });

      expect(response.status).toBe(200);
      expect(mockScanInbox).toHaveBeenCalledWith(expect.objectContaining({
        accessToken: 'header-token',
      }));
    });

    test('should return 400 Bad Request if clientId is missing in both body and environment', async () => {
      const response = await request(app)
        .post('/scan')
        .send({
          accessToken: 'mock-token',
          clientSecret: 'mock-secret',
          supplierEmails: ['supplier@test.com'],
        });

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toContain('Credenciales del cliente OAuth');
      expect(response.body.technicalError).toContain('Missing required parameters: clientId or clientSecret');
      expect(mockScanInbox).not.toHaveBeenCalled();
    });

    test('should return 400 Bad Request if supplierEmails is missing or not an array', async () => {
      const response = await request(app)
        .post('/scan')
        .send({
          accessToken: 'mock-token',
          clientId: 'mock-id',
          clientSecret: 'mock-secret',
          supplierEmails: 'not-an-array',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        userMessage: 'Lista de correos de proveedores no válida o no proporcionada.',
        technicalError: 'Missing or invalid parameter: supplierEmails must be an array of strings',
      });
      expect(mockScanInbox).not.toHaveBeenCalled();
    });

    test('should call ScannerService and return 200 with result when body validation passes', async () => {
      const mockResult = [
        {
          supplierRuc: '12345678-9',
          supplierName: 'Test Supplier',
          total: 100,
          items: [],
        },
      ];

      mockScanInbox.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/scan')
        .send({
          accessToken: 'mock-token',
          clientId: 'mock-id',
          clientSecret: 'mock-secret',
          supplierEmails: ['supplier@test.com'],
          sinceDate: '2026-06-01T00:00:00.000Z',
          geminiApiKey: 'mock-gemini-key',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockScanInbox).toHaveBeenCalledWith({
        accessToken: 'mock-token',
        clientId: 'mock-id',
        clientSecret: 'mock-secret',
        supplierEmails: ['supplier@test.com'],
        sinceDate: '2026-06-01T00:00:00.000Z',
        geminiApiKey: 'mock-gemini-key',
        refreshToken: undefined,
      });
    });

    test('should resolve clientId/clientSecret from process.env if omitted in request body', async () => {
      process.env.GOOGLE_CLIENT_ID = 'env-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';
      process.env.GEMINI_API_KEY = 'env-gemini-key';

      mockScanInbox.mockResolvedValue([]);

      const response = await request(app)
        .post('/scan')
        .send({
          accessToken: 'mock-token',
          supplierEmails: ['supplier@test.com'],
        });

      expect(response.status).toBe(200);
      expect(mockScanInbox).toHaveBeenCalledWith({
        accessToken: 'mock-token',
        clientId: 'env-client-id',
        clientSecret: 'env-client-secret',
        supplierEmails: ['supplier@test.com'],
        sinceDate: undefined,
        geminiApiKey: 'env-gemini-key',
        refreshToken: undefined,
      });
    });

    test('should return 500 Internal Server Error if ScannerService throws an error', async () => {
      mockScanInbox.mockRejectedValue(new Error('Gmail API Limit Exceeded'));

      const response = await request(app)
        .post('/scan')
        .send({
          accessToken: 'mock-token',
          clientId: 'mock-id',
          clientSecret: 'mock-secret',
          supplierEmails: ['supplier@test.com'],
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        userMessage: 'Ocurrió un error al escanear la bandeja de entrada. Por favor, intente de nuevo más tarde.',
        technicalError: 'Gmail API Limit Exceeded',
      });
    });
  });
});
