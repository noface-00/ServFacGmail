import { Request, Response } from 'express';
import { ScannerService, ScanRequest } from './scanner.service.js';

export class ScannerController {
  private scannerService: ScannerService;

  constructor() {
    this.scannerService = new ScannerService();
  }

  public scan = async (req: Request, res: Response): Promise<void> => {
    try {
      let { accessToken, refreshToken, supplierEmails, sinceDate } = req.body;
      const clientId = req.body.clientId || process.env.GOOGLE_CLIENT_ID;
      const clientSecret = req.body.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
      const geminiApiKey = req.body.geminiApiKey || process.env.GEMINI_API_KEY;

      // Fallback to Authorization Header for accessToken
      if (!accessToken && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
          accessToken = parts[1];
        }
      }

      // Basic validation
      if (!accessToken) {
        res.status(400).json({
          userMessage: 'Token de acceso no proporcionado.',
          technicalError: 'Missing required parameter: accessToken (must be provided in the body or in the Authorization Bearer header)',
        });
        return;
      }
      if (!clientId || !clientSecret) {
        res.status(400).json({
          userMessage: 'Credenciales del cliente OAuth (Client ID o Client Secret) no proporcionadas.',
          technicalError: 'Missing required parameters: clientId or clientSecret (must be provided in the body or configured as environment variables)',
        });
        return;
      }
      if (!supplierEmails || !Array.isArray(supplierEmails)) {
        res.status(400).json({
          userMessage: 'Lista de correos de proveedores no válida o no proporcionada.',
          technicalError: 'Missing or invalid parameter: supplierEmails must be an array of strings',
        });
        return;
      }

      const scanRequest: ScanRequest = {
        accessToken,
        refreshToken,
        clientId,
        clientSecret,
        supplierEmails,
        sinceDate,
        geminiApiKey,
      };

      console.log(`Starting scan for ${supplierEmails.length} suppliers...`);
      const results = await this.scannerService.scanInbox(scanRequest);
      console.log(`Scan completed. Found ${results.length} valid invoice attachments.`);

      res.status(200).json(results);
    } catch (error: any) {
      console.error('Scan execution error:', error);
      res.status(500).json({
        userMessage: 'Ocurrió un error al escanear la bandeja de entrada. Por favor, intente de nuevo más tarde.',
        technicalError: error.message || String(error),
      });
    }
  };
}
