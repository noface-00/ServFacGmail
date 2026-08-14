import { signState, verifyState } from '../oauth-state.js';

describe('oauth-state', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, TOKEN_ENCRYPTION_KEY: 'a'.repeat(64) };
    jest.useFakeTimers().setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('a freshly signed state is valid', () => {
    const state = signState();
    expect(verifyState(state)).toBe(true);
  });

  test('rejects an undefined state', () => {
    expect(verifyState(undefined)).toBe(false);
  });

  test('rejects a malformed state', () => {
    expect(verifyState('not-a-valid-state')).toBe(false);
  });

  test('rejects a state with a tampered signature', () => {
    const state = signState();
    const [nonce, timestamp, hmac] = state.split('.');
    const tamperedHmac = hmac.slice(0, -2) + (hmac.slice(-2) === '00' ? '01' : '00');
    expect(verifyState(`${nonce}.${timestamp}.${tamperedHmac}`)).toBe(false);
  });

  test('rejects a state with a tampered timestamp', () => {
    const state = signState();
    const [nonce, , hmac] = state.split('.');
    expect(verifyState(`${nonce}.${Date.now() + 1}.${hmac}`)).toBe(false);
  });

  test('rejects an expired state (older than 10 minutes)', () => {
    const state = signState();
    jest.setSystemTime(new Date('2026-08-14T12:10:01.000Z'));
    expect(verifyState(state)).toBe(false);
  });

  test('accepts a state right at the edge of the TTL', () => {
    const state = signState();
    jest.setSystemTime(new Date('2026-08-14T12:09:59.000Z'));
    expect(verifyState(state)).toBe(true);
  });
});
