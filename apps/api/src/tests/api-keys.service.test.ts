const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../prisma.js', () => ({
  prisma: {
    apiKey: {
      create: (...args: any[]) => mockCreate(...args),
      findUnique: (...args: any[]) => mockFindUnique(...args),
      findMany: (...args: any[]) => mockFindMany(...args),
      update: (...args: any[]) => mockUpdate(...args),
    },
  },
}));

import { ApiKeysService, ApiKeyNotFoundError, hashKey, safeEqual } from '../api-keys.service.js';

describe('ApiKeysService', () => {
  const service = new ApiKeysService();

  beforeEach(() => {
    mockCreate.mockReset();
    mockFindUnique.mockReset();
    mockFindMany.mockReset();
    mockUpdate.mockReset();
    mockUpdate.mockResolvedValue({});
  });

  test('createKey returns the plaintext key once and persists only its hash', async () => {
    mockCreate.mockImplementation(async ({ data }: any) => ({ id: 'k1', ...data }));

    const { key } = await service.createKey('cliente-a', ['a@empresa.com']);

    expect(key).toMatch(/^sfg_[A-Za-z0-9_-]{43}$/);
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.keyHash).toBe(hashKey(key));
    expect(data.keyPrefix).toBe(key.slice(0, 8));
    expect(data.allowedAccounts).toEqual(['a@empresa.com']);
    expect(JSON.stringify(mockCreate.mock.calls[0][0])).not.toContain(key);
  });

  test('createKey generates a different key each time', async () => {
    mockCreate.mockImplementation(async ({ data }: any) => ({ id: 'k1', ...data }));
    const a = await service.createKey('a');
    const b = await service.createKey('b');
    expect(a.key).not.toBe(b.key);
  });

  test('verifyKey looks the key up by hash and returns its scope', async () => {
    mockFindUnique.mockResolvedValue({ id: 'k1', name: 'cliente-a', allowedAccounts: ['a@empresa.com'], revokedAt: null });

    const result = await service.verifyKey('sfg_raw');

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { keyHash: hashKey('sfg_raw') } });
    expect(result).toEqual({ id: 'k1', name: 'cliente-a', allowedAccounts: ['a@empresa.com'] });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'k1' } }));
  });

  test('verifyKey rejects unknown and revoked keys', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    expect(await service.verifyKey('nope')).toBeNull();

    mockFindUnique.mockResolvedValueOnce({ id: 'k1', name: 'x', allowedAccounts: [], revokedAt: new Date() });
    expect(await service.verifyKey('revoked')).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('verifyKey does not fail when updating lastUsedAt fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFindUnique.mockResolvedValue({ id: 'k1', name: 'x', allowedAccounts: [], revokedAt: null });
    mockUpdate.mockRejectedValue(new Error('db down'));

    await expect(service.verifyKey('sfg_raw')).resolves.toMatchObject({ id: 'k1' });
    errorSpy.mockRestore();
  });

  test('listKeys never selects the hash', async () => {
    mockFindMany.mockResolvedValue([]);
    await service.listKeys();
    const select = mockFindMany.mock.calls[0][0].select;
    expect(select.keyHash).toBeUndefined();
    expect(select.keyPrefix).toBe(true);
  });

  test('revokeKey sets revokedAt and throws when the key does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'k1', revokedAt: null });
    await service.revokeKey('k1');
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'k1' }, data: { revokedAt: expect.any(Date) } });

    mockFindUnique.mockResolvedValueOnce(null);
    await expect(service.revokeKey('missing')).rejects.toBeInstanceOf(ApiKeyNotFoundError);
  });

  test('safeEqual compares values of different lengths without throwing', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('', 'abc')).toBe(false);
  });
});
