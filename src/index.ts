import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ScannerController } from './scanner.controller.js';
import { AccountsController } from './accounts.controller.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3005;

// Middleware
app.use(cors());
// Set limits high enough to handle base64 files transfer
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Key authentication middleware
const requireApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const serviceApiKey = process.env.SERVICE_API_KEY;
  if (!serviceApiKey) {
    console.error('FATAL: SERVICE_API_KEY is not configured in the environment. Rejecting all requests.');
    res.status(503).json({
      userMessage: 'Servicio no disponible temporalmente debido a un error de configuración.',
      technicalError: 'SERVICE_API_KEY is not configured in the environment',
    });
    return;
  }

  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey || apiKey !== serviceApiKey) {
    res.status(401).json({
      userMessage: 'No autorizado.',
      technicalError: 'Invalid or missing API key (x-api-key header or apiKey query parameter)',
    });
    return;
  }

  next();
};

// Controller instantiation
const scannerController = new ScannerController();
const accountsController = new AccountsController();

// Routes
app.post('/scan', requireApiKey, scannerController.scan);
app.post('/scan-sent', requireApiKey, scannerController.scanSent);
app.get('/download-pdf', requireApiKey, scannerController.downloadPDF);
app.post('/download-pdf', requireApiKey, scannerController.downloadPDF);

// Google OAuth account connection routes.
// /auth/google/callback has no x-api-key: it's hit by the end user's browser after
// Google's redirect, so it's protected by the signed `state` param instead (see oauth-state.ts).
app.get('/auth/google/login', requireApiKey, accountsController.login);
app.get('/auth/google/callback', accountsController.callback);
app.get('/accounts', requireApiKey, accountsController.list);
app.delete('/accounts/:email', requireApiKey, accountsController.remove);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'gmail-scanner-service' });
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
