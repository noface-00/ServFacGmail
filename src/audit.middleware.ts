import { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma.js';

/**
 * Records who called which endpoint and the outcome. Deliberately stores no request body, token,
 * API key or email content — only the key id, route, target account, status and IP.
 * Register it after authentication and before the route handlers; the row is written on `finish`.
 */
export const auditAccess = (req: Request, res: Response, next: NextFunction): void => {
  res.on('finish', () => {
    const candidate = req.body?.accountEmail ?? req.query?.accountEmail ?? req.params?.email;
    const accountEmail = typeof candidate === 'string' && candidate ? candidate.slice(0, 254) : null;

    // req.route is only set once a route matched; fall back to the path for unmatched requests.
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;

    prisma.auditLog
      .create({
        data: {
          apiKeyId: req.auth?.keyId ?? null,
          action: `${req.method} ${route}`.slice(0, 200),
          accountEmail,
          statusCode: res.statusCode,
          ip: req.ip ?? null,
        },
      })
      .catch((err: unknown) => console.error('Failed to write audit log:', err));
  });
  next();
};
