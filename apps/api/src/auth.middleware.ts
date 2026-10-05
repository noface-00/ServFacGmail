import { Request, Response, NextFunction } from 'express';
import { ApiKeysService, safeEqual } from './api-keys.service.js';

export interface AuthPrincipal {
  /** null for the master key (SERVICE_API_KEY). */
  keyId: string | null;
  isAdmin: boolean;
  /** Empty means "all accounts". */
  allowedAccounts: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPrincipal;
    }
  }
}

const apiKeysService = new ApiKeysService();

export const requireApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const masterKey = process.env.SERVICE_API_KEY;
  if (!masterKey) {
    console.error('FATAL: SERVICE_API_KEY is not configured in the environment. Rejecting all requests.');
    res.status(503).json({
      userMessage: 'Servicio no disponible temporalmente debido a un error de configuración.',
      technicalError: 'SERVICE_API_KEY is not configured in the environment',
    });
    return;
  }

  const header = req.headers['x-api-key'];
  const provided = Array.isArray(header) ? header[0] : header;
  if (!provided) {
    res.status(401).json({
      userMessage: 'No autorizado.',
      technicalError: 'Invalid or missing API key (x-api-key header)',
    });
    return;
  }

  if (safeEqual(provided, masterKey)) {
    req.auth = { keyId: null, isAdmin: true, allowedAccounts: [] };
    next();
    return;
  }

  try {
    const verified = await apiKeysService.verifyKey(provided);
    if (!verified) {
      res.status(401).json({
        userMessage: 'No autorizado.',
        technicalError: 'Invalid or missing API key (x-api-key header)',
      });
      return;
    }
    req.auth = { keyId: verified.id, isAdmin: false, allowedAccounts: verified.allowedAccounts };
    next();
  } catch (error: any) {
    // The caller is not authenticated yet, so don't echo internal (DB/Prisma) error details.
    console.error('API key verification failed:', error);
    res.status(500).json({
      userMessage: 'Ocurrió un error al validar las credenciales.',
      technicalError: 'API key verification failed',
    });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.auth?.isAdmin) {
    res.status(403).json({
      userMessage: 'No tiene permisos para realizar esta operación.',
      technicalError: 'This endpoint requires the master API key',
    });
    return;
  }
  next();
};

export function isAccountAllowed(auth: AuthPrincipal | undefined, accountEmail: string): boolean {
  if (!auth) return false;
  if (auth.isAdmin || auth.allowedAccounts.length === 0) return true;
  const target = accountEmail.trim().toLowerCase();
  return auth.allowedAccounts.some((allowed) => allowed.toLowerCase() === target);
}

/**
 * Rejects the request when the key is restricted to specific Gmail accounts and the requested
 * `accountEmail` is not one of them. A missing accountEmail is left to the controller's own 400.
 */
export const enforceAccountScope = (req: Request, res: Response, next: NextFunction): void => {
  const candidate = req.body?.accountEmail ?? req.query?.accountEmail ?? req.params?.email;
  const isRestricted = !req.auth?.isAdmin && (req.auth?.allowedAccounts.length ?? 0) > 0;
  const denied =
    candidate !== undefined && candidate !== '' && (typeof candidate !== 'string' ? isRestricted : !isAccountAllowed(req.auth, candidate));
  if (denied) {
    res.status(403).json({
      userMessage: 'La clave de API no tiene acceso a la cuenta de Gmail solicitada.',
      technicalError: 'API key is not allowed to access the requested accountEmail',
    });
    return;
  }
  next();
};
