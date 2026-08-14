import crypto from 'crypto';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos

function getSecret(): string {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not configured in the environment');
  }
  return secret;
}

export function signState(): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `${nonce}.${timestamp}`;
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

export function verifyState(state: string | undefined): boolean {
  if (!state) return false;

  const parts = state.split('.');
  if (parts.length !== 3) return false;
  const [nonce, timestamp, hmac] = parts;

  const expected = crypto.createHmac('sha256', getSecret()).update(`${nonce}.${timestamp}`).digest('hex');

  const hmacBuffer = Buffer.from(hmac, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (hmacBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(hmacBuffer, expectedBuffer)) {
    return false;
  }

  const age = Date.now() - parseInt(timestamp, 10);
  return age >= 0 && age <= STATE_TTL_MS;
}
