import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ScannerController } from './scanner.controller.js';
import { AccountsController } from './accounts.controller.js';
import { ApiKeysController } from './api-keys.controller.js';
import { requireApiKey, requireAdmin, enforceAccountScope } from './auth.middleware.js';
import { auditAccess } from './audit.middleware.js';
import { globalLimiter, scanLimiter } from './rate-limit.js';
import {
  validate,
  validateDownloadPdf,
  scanSchema,
  scanSentSchema,
  createApiKeySchema,
  emailParamSchema,
} from './validation.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3005;

// Behind Dokploy/Traefik, req.ip must come from X-Forwarded-For or every client looks like the
// proxy and shares one rate-limit bucket. Set TRUST_PROXY to the number of proxies in front (default 1).
const trustProxy = process.env.TRUST_PROXY ?? '1';
app.set('trust proxy', /^\d+$/.test(trustProxy) ? parseInt(trustProxy, 10) : trustProxy === 'true');

// Middleware
app.use(helmet());

// This service is called server-to-server; no browser origin is allowed unless CORS_ORIGINS lists it.
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : false }));

// Runs before body parsing so oversized/abusive requests are throttled before being parsed.
app.use(globalLimiter);

// Set limits high enough to handle base64 files transfer
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Controller instantiation
const scannerController = new ScannerController();
const accountsController = new AccountsController();
const apiKeysController = new ApiKeysController();

// Routes
app.post('/scan', requireApiKey, scanLimiter, enforceAccountScope, auditAccess, validate(scanSchema), scannerController.scan);
app.post('/scan-sent', requireApiKey, scanLimiter, enforceAccountScope, auditAccess, validate(scanSentSchema), scannerController.scanSent);
app.get('/download-pdf', requireApiKey, scanLimiter, enforceAccountScope, auditAccess, validateDownloadPdf, scannerController.downloadPDF);
app.post('/download-pdf', requireApiKey, scanLimiter, enforceAccountScope, auditAccess, validateDownloadPdf, scannerController.downloadPDF);

// Google OAuth account connection routes.
// /auth/google/callback has no x-api-key: it's hit by the end user's browser after
// Google's redirect, so it's protected by the signed `state` param instead (see oauth-state.ts).
// Connecting/disconnecting Gmail accounts is privileged, so those routes require the master key.
app.get('/auth/google/login', requireApiKey, requireAdmin, auditAccess, accountsController.login);
app.get('/auth/google/callback', accountsController.callback);
app.get('/accounts', requireApiKey, auditAccess, accountsController.list);
app.delete('/accounts/:email', requireApiKey, requireAdmin, auditAccess, validate(emailParamSchema, 'params'), accountsController.remove);

// API key management (master key only)
app.post('/admin/api-keys', requireApiKey, requireAdmin, auditAccess, validate(createApiKeySchema), apiKeysController.create);
app.get('/admin/api-keys', requireApiKey, requireAdmin, auditAccess, apiKeysController.list);
app.delete('/admin/api-keys/:id', requireApiKey, requireAdmin, auditAccess, apiKeysController.revoke);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'gmail-scanner-service' });
});

// Malformed JSON and oversized bodies would otherwise get Express's default HTML error page.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    res.status(err.status || 400).json({
      userMessage: 'La solicitud no es válida.',
      technicalError: err.type,
    });
    return;
  }
  next(err);
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`===============================================`);
    console.log(`  Gmail Invoice Scanner Service running on port ${port}`);
    console.log(`  POST /scan is active and ready`);
    console.log(`===============================================`);
  });
}

export default app;
