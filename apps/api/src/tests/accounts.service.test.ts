import { google } from 'googleapis';
import {
  AccountsService,
  AccountNotFoundError,
  InvalidOAuthStateError,
} from '../accounts.service.js';
import { prisma } from '../prisma.js';
import { encrypt, decrypt } from '../crypto.util.js';
import { signState } from '../oauth-state.js';

jest.mock('googleapis');

jest.mock('../prisma.js', () => ({
  prisma: {
    gmailAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  gmailAccount: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    upsert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

describe('AccountsService', () => {
  let accountsService: AccountsService;
  let mockGetToken: jest.Mock;
  let mockSetCredentials: jest.Mock;
  let mockGenerateAuthUrl: jest.Mock;
  let mockOn: jest.Mock;
  let mockGetProfile: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);
    process.env.GOOGLE_CLIENT_ID = 'mock-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'mock-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'https://example.com/auth/google/callback';

    mockGetToken = jest.fn();
    mockSetCredentials = jest.fn();
    mockGenerateAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1');
    mockOn = jest.fn();

    (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => ({
      generateAuthUrl: mockGenerateAuthUrl,
      getToken: mockGetToken,
      setCredentials: mockSetCredentials,
      on: mockOn,
    }));

    mockGetProfile = jest.fn();
    (google.gmail as jest.Mock).mockReturnValue({
      users: { getProfile: mockGetProfile },
    });

    accountsService = new AccountsService();
  });

  describe('getAuthUrl', () => {
    test('requests offline access, consent prompt and gmail.readonly scope', () => {
      accountsService.getAuthUrl();
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: 'offline',
          prompt: 'consent',
          scope: ['https://www.googleapis.com/auth/gmail.readonly'],
          state: expect.any(String),
        }),
      );
    });
  });

  describe('handleCallback', () => {
    test('rejects an invalid state before exchanging the code', async () => {
      await expect(accountsService.handleCallback('some-code', 'invalid-state')).rejects.toThrow(
        InvalidOAuthStateError,
      );
      expect(mockGetToken).not.toHaveBeenCalled();
    });

    test('exchanges the code, encrypts tokens, and persists the account', async () => {
      const state = signState();
      mockGetToken.mockResolvedValue({
        tokens: {
          access_token: 'plain-access-token',
          refresh_token: 'plain-refresh-token',
          expiry_date: Date.now() + 3600_000,
          scope: 'https://www.googleapis.com/auth/gmail.readonly',
        },
      });
      mockGetProfile.mockResolvedValue({ data: { emailAddress: 'compras@empresa.com' } });
      mockedPrisma.gmailAccount.findUnique.mockResolvedValue(null);
      mockedPrisma.gmailAccount.upsert.mockResolvedValue({});

      const email = await accountsService.handleCallback('auth-code', state);

      expect(email).toBe('compras@empresa.com');
      expect(mockedPrisma.gmailAccount.upsert).toHaveBeenCalledTimes(1);
      const call = mockedPrisma.gmailAccount.upsert.mock.calls[0][0];
      expect(call.where).toEqual({ email: 'compras@empresa.com' });
      expect(call.create.accessTokenEnc).not.toBe('plain-access-token');
      expect(call.create.refreshTokenEnc).not.toBe('plain-refresh-token');
      expect(decrypt(call.create.accessTokenEnc)).toBe('plain-access-token');
      expect(decrypt(call.create.refreshTokenEnc)).toBe('plain-refresh-token');
    });

    test('throws if Google omits refresh_token for a brand new account', async () => {
      const state = signState();
      mockGetToken.mockResolvedValue({
        tokens: { access_token: 'plain-access-token', expiry_date: Date.now() + 3600_000 },
      });
      mockGetProfile.mockResolvedValue({ data: { emailAddress: 'compras@empresa.com' } });
      mockedPrisma.gmailAccount.findUnique.mockResolvedValue(null);

      await expect(accountsService.handleCallback('auth-code', state)).rejects.toThrow(
        /did not return a refresh_token/,
      );
      expect(mockedPrisma.gmailAccount.upsert).not.toHaveBeenCalled();
    });

    test('does not require a fresh refresh_token when reconnecting an existing account', async () => {
      const state = signState();
      mockGetToken.mockResolvedValue({
        tokens: { access_token: 'new-access-token', expiry_date: Date.now() + 3600_000 },
      });
      mockGetProfile.mockResolvedValue({ data: { emailAddress: 'compras@empresa.com' } });
      mockedPrisma.gmailAccount.findUnique.mockResolvedValue({ email: 'compras@empresa.com' });
      mockedPrisma.gmailAccount.upsert.mockResolvedValue({});

      const email = await accountsService.handleCallback('auth-code', state);

      expect(email).toBe('compras@empresa.com');
      const call = mockedPrisma.gmailAccount.upsert.mock.calls[0][0];
      expect(call.update.refreshTokenEnc).toBeUndefined();
    });
  });

  describe('listAccounts', () => {
    test('never exposes token fields', async () => {
      mockedPrisma.gmailAccount.findMany.mockResolvedValue([
        { email: 'a@empresa.com', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-02-01') },
      ]);

      const accounts = await accountsService.listAccounts();

      expect(accounts).toEqual([
        { email: 'a@empresa.com', connectedAt: new Date('2026-01-01'), updatedAt: new Date('2026-02-01') },
      ]);
      expect(mockedPrisma.gmailAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ select: { email: true, createdAt: true, updatedAt: true } }),
      );
    });
  });

  describe('deleteAccount', () => {
    test('throws AccountNotFoundError when Prisma cannot find the row', async () => {
      mockedPrisma.gmailAccount.delete.mockRejectedValue(new Error('Record to delete does not exist.'));
      await expect(accountsService.deleteAccount('missing@empresa.com')).rejects.toThrow(AccountNotFoundError);
    });

    test('resolves when the account is deleted successfully', async () => {
      mockedPrisma.gmailAccount.delete.mockResolvedValue({});
      await expect(accountsService.deleteAccount('a@empresa.com')).resolves.toBeUndefined();
    });
  });

  describe('getAuthorizedClient', () => {
    test('throws AccountNotFoundError if the account does not exist', async () => {
      mockedPrisma.gmailAccount.findUnique.mockResolvedValue(null);
      await expect(accountsService.getAuthorizedClient('missing@empresa.com')).rejects.toThrow(
        AccountNotFoundError,
      );
    });

    test('decrypts stored credentials and wires them into the OAuth2 client', async () => {
      const expiresAt = new Date(Date.now() + 3600_000);
      mockedPrisma.gmailAccount.findUnique.mockResolvedValue({
        email: 'a@empresa.com',
        accessTokenEnc: encrypt('stored-access-token'),
        refreshTokenEnc: encrypt('stored-refresh-token'),
        accessTokenExpiresAt: expiresAt,
      });

      await accountsService.getAuthorizedClient('a@empresa.com');

      expect(mockSetCredentials).toHaveBeenCalledWith({
        access_token: 'stored-access-token',
        refresh_token: 'stored-refresh-token',
        expiry_date: expiresAt.getTime(),
      });
      expect(mockOn).toHaveBeenCalledWith('tokens', expect.any(Function));
    });

    test('persists a refreshed access token when the client emits a "tokens" event', async () => {
      mockedPrisma.gmailAccount.findUnique.mockResolvedValue({
        email: 'a@empresa.com',
        accessTokenEnc: encrypt('stored-access-token'),
        refreshTokenEnc: encrypt('stored-refresh-token'),
        accessTokenExpiresAt: new Date(),
      });
      mockedPrisma.gmailAccount.update.mockResolvedValue({});

      await accountsService.getAuthorizedClient('a@empresa.com');
      const tokensListener = mockOn.mock.calls.find((call) => call[0] === 'tokens')![1];

      const newExpiry = Date.now() + 3600_000;
      await tokensListener({ access_token: 'refreshed-access-token', expiry_date: newExpiry });

      expect(mockedPrisma.gmailAccount.update).toHaveBeenCalledTimes(1);
      const updateCall = mockedPrisma.gmailAccount.update.mock.calls[0][0];
      expect(updateCall.where).toEqual({ email: 'a@empresa.com' });
      expect(decrypt(updateCall.data.accessTokenEnc)).toBe('refreshed-access-token');
      expect(updateCall.data.refreshTokenEnc).toBeUndefined();
    });
  });
});
