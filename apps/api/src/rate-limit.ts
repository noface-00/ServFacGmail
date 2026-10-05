import { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000;

function intFromEnv(name: string, fallback: number): number {
  const parsed = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function tooManyRequests(_req: Request, res: Response): void {
  res.status(429).json({
    userMessage: 'Demasiadas solicitudes. Intente de nuevo más tarde.',
    technicalError: 'Rate limit exceeded',
  });
}

const ipKey = (req: Request): string => ipKeyGenerator(req.ip ?? '');

// Limits are read when the limiter is built (once, at startup) so they can be set from the env.

/** Per-IP limiter placed before authentication: slows down API key guessing. */
export const globalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: intFromEnv('RATE_LIMIT_GLOBAL', 300),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  skip: (req) => req.path === '/health',
  handler: tooManyRequests,
});

/** Stricter per-key limiter for the expensive Gmail/Gemini endpoints. Runs after authentication. */
export const scanLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: intFromEnv('RATE_LIMIT_SCAN', 30),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => (req.auth?.keyId ? `key:${req.auth.keyId}` : `ip:${ipKey(req)}`),
  handler: tooManyRequests,
});
