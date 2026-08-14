import request from 'supertest';
import app from '../index.js';
import { AccountNotFoundError, InvalidOAuthStateError } from '../accounts.service.js';

const mockGetAuthUrl = jest.fn();
const mockHandleCallback = jest.fn();
const mockListAccounts = jest.fn();
const mockDeleteAccount = jest.fn();
const mockGetAuthorizedClient = jest.fn();

jest.mock('../accounts.service.js', () => {
  const actual = jest.requireActual('../accounts.service.js');
  return {
    ...actual,
    AccountsService: jest.fn().mockImplementation(() => ({
      getAuthUrl: (...args: any[]) => mockGetAuthUrl(...args),
      handleCallback: (...args: any[]) => mockHandleCallback(...args),
      listAccounts: (...args: any[]) => mockListAccounts(...args),
      deleteAccount: (...args: any[]) => mockDeleteAccount(...args),
      getAuthorizedClient: (...args: any[]) => mockGetAuthorizedClient(...args),
    })),
  };
});

describe('AccountsController Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockGetAuthUrl.mockReset();
    mockHandleCallback.mockReset();
    mockListAccounts.mockReset();
    mockDeleteAccount.mockReset();
    mockGetAuthorizedClient.mockReset();
    process.env = {
      ...originalEnv,
      SERVICE_API_KEY: 'test-api-key',
      GOOGLE_CLIENT_ID: 'env-client-id',
      GOOGLE_CLIENT_SECRET: 'env-client-secret',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('GET /auth/google/login', () => {
    test('requires x-api-key', async () => {
      const response = await request(app).get('/auth/google/login');
      expect(response.status).toBe(401);
      expect(mockGetAuthUrl).not.toHaveBeenCalled();
    });

    test('returns the Google consent URL when authorized', async () => {
      mockGetAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1');
      const response = await request(app).get('/auth/google/login').set('x-api-key', 'test-api-key');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?mock=1' });
    });
  });

  describe('GET /auth/google/callback', () => {
    test('works without x-api-key and returns HTML on success', async () => {
      mockHandleCallback.mockResolvedValue('compras@empresa.com');
      const response = await request(app).get('/auth/google/callback?code=abc&state=xyz');
      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('compras@empresa.com');
    });

    test('returns 400 if Google reports the user cancelled consent', async () => {
      const response = await request(app).get('/auth/google/callback?error=access_denied');
      expect(response.status).toBe(400);
      expect(mockHandleCallback).not.toHaveBeenCalled();
    });

    test('returns 400 if the state is invalid or expired', async () => {
      mockHandleCallback.mockRejectedValue(new InvalidOAuthStateError());
      const response = await request(app).get('/auth/google/callback?code=abc&state=bad');
      expect(response.status).toBe(400);
    });

    test('returns 500 on an unexpected exchange failure', async () => {
      mockHandleCallback.mockRejectedValue(new Error('boom'));
      const response = await request(app).get('/auth/google/callback?code=abc&state=xyz');
      expect(response.status).toBe(500);
    });
  });

  describe('GET /accounts', () => {
    test('requires x-api-key', async () => {
      const response = await request(app).get('/accounts');
      expect(response.status).toBe(401);
    });

    test('lists connected accounts without exposing tokens', async () => {
      mockListAccounts.mockResolvedValue([
        { email: 'a@empresa.com', connectedAt: new Date('2026-01-01').toISOString(), updatedAt: new Date('2026-02-01').toISOString() },
      ]);
      const response = await request(app).get('/accounts').set('x-api-key', 'test-api-key');
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(JSON.stringify(response.body)).not.toMatch(/token/i);
    });
  });

  describe('DELETE /accounts/:email', () => {
    test('requires x-api-key', async () => {
      const response = await request(app).delete('/accounts/a@empresa.com');
      expect(response.status).toBe(401);
    });

    test('returns 404 if the account is not connected', async () => {
      mockDeleteAccount.mockRejectedValue(new AccountNotFoundError('missing@empresa.com'));
      const response = await request(app).delete('/accounts/missing@empresa.com').set('x-api-key', 'test-api-key');
      expect(response.status).toBe(404);
    });

    test('returns 200 when the account is deleted', async () => {
      mockDeleteAccount.mockResolvedValue(undefined);
      const response = await request(app).delete('/accounts/a@empresa.com').set('x-api-key', 'test-api-key');
      expect(response.status).toBe(200);
    });
  });
});
