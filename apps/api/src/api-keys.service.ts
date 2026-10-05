import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from './prisma.js';

const KEY_PREFIX = 'sfg_';

export class ApiKeyNotFoundError extends Error {
  constructor(id: string) {
    super(`No ApiKey found with id: ${id}`);
    this.name = 'ApiKeyNotFoundError';
  }
}

export interface VerifiedApiKey {
  id: string;
  name: string;
  allowedAccounts: string[];
}

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  allowedAccounts: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Constant-time comparison. Both sides are hashed first so the buffers always have the same
 * length, which avoids leaking the length of the expected value.
 */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

export class ApiKeysService {
  /** Returns the plaintext key exactly once; only its hash is persisted. */
  public async createKey(name: string, allowedAccounts: string[] = []): Promise<{ key: string; summary: ApiKeySummary }> {
    const key = `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
    const created = await prisma.apiKey.create({
      data: {
        name,
        keyHash: hashKey(key),
        keyPrefix: key.slice(0, KEY_PREFIX.length + 4),
        allowedAccounts,
      },
      select: this.summarySelect,
    });
    return { key, summary: created };
  }

  public async verifyKey(raw: string): Promise<VerifiedApiKey | null> {
    const found = await prisma.apiKey.findUnique({ where: { keyHash: hashKey(raw) } });
    if (!found || found.revokedAt) {
      return null;
    }

    // Best-effort: usage tracking must never fail or delay the request.
    prisma.apiKey
      .update({ where: { id: found.id }, data: { lastUsedAt: new Date() } })
      .catch((err: unknown) => console.error('Failed to update ApiKey.lastUsedAt:', err));

    return { id: found.id, name: found.name, allowedAccounts: found.allowedAccounts };
  }

  public async listKeys(): Promise<ApiKeySummary[]> {
    return prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' }, select: this.summarySelect });
  }

  public async revokeKey(id: string): Promise<void> {
    const found = await prisma.apiKey.findUnique({ where: { id } });
    if (!found) {
      throw new ApiKeyNotFoundError(id);
    }
    if (!found.revokedAt) {
      await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    }
  }

  private summarySelect = {
    id: true,
    name: true,
    keyPrefix: true,
    allowedAccounts: true,
    createdAt: true,
    lastUsedAt: true,
    revokedAt: true,
  } as const;
}
