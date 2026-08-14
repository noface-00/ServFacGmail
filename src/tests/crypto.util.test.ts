import { encrypt, decrypt } from '../crypto.util.js';

describe('crypto.util', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, TOKEN_ENCRYPTION_KEY: 'a'.repeat(64) };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('encrypts and decrypts back to the original plaintext', () => {
    const plainText = 'ya29.a0Ar-super-secret-refresh-token';
    const encrypted = encrypt(plainText);
    expect(encrypted).not.toBe(plainText);
    expect(decrypt(encrypted)).toBe(plainText);
  });

  test('produces a different ciphertext on each call due to a random IV', () => {
    const plainText = 'same-token';
    expect(encrypt(plainText)).not.toBe(encrypt(plainText));
  });

  test('throws if the encrypted payload was tampered with', () => {
    const encrypted = encrypt('some-token');
    const [iv, authTag, data] = encrypted.split(':');
    const tampered = `${iv}:${authTag}:${data.slice(0, -2)}ff`;
    expect(() => decrypt(tampered)).toThrow();
  });

  test('throws if the auth tag was tampered with', () => {
    const encrypted = encrypt('some-token');
    const [iv, authTag, data] = encrypted.split(':');
    const flippedAuthTag = authTag.slice(0, -2) + (authTag.slice(-2) === '00' ? '01' : '00');
    expect(() => decrypt(`${iv}:${flippedAuthTag}:${data}`)).toThrow();
  });

  test('throws if TOKEN_ENCRYPTION_KEY is not configured', () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encrypt('some-token')).toThrow('TOKEN_ENCRYPTION_KEY is not configured');
  });

  test('throws if TOKEN_ENCRYPTION_KEY is not a 32-byte hex value', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'too-short';
    expect(() => encrypt('some-token')).toThrow('TOKEN_ENCRYPTION_KEY must be a 32-byte value');
  });
});
