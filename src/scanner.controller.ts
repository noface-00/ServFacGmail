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
      if (!sinceDate) {
        res.status(400).json({
          userMessage: 'Fecha de inicio (sinceDate) no proporcionada.',
          technicalError: 'Missing required parameter: sinceDate is mandatory',
        });
        return;
      }

      if (!supplierEmails) {
        const envEmails = process.env.SUPPLIER_EMAILS;
        if (envEmails) {
          supplierEmails = envEmails.split(',').map(email => email.trim());
        } else {
          res.status(400).json({
            userMessage: 'Lista de correos de proveedores no proporcionada.',
            technicalError: 'Missing parameter: supplierEmails must be provided in the body or configured in the environment variable SUPPLIER_EMAILS',
          });
          return;
        }
      } else if (!Array.isArray(supplierEmails)) {
        res.status(400).json({
          userMessage: 'Lista de correos de proveedores no válida.',
          technicalError: 'Invalid parameter: supplierEmails must be an array of strings',
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
      const results = await this.scannerService.scan(scanRequest);
      console.log(`Scan completed. Found ${results.length} valid invoice attachments.`);

      res.status(200).json({
        facturas: results,
        count: results.length,
      });
    } catch (error: any) {
      console.error('Scan execution error:', error);
      res.status(500).json({
        userMessage: 'Ocurrió un error al escanear la bandeja de entrada. Por favor, intente de nuevo más tarde.',
        technicalError: error.message || String(error),
      });
    }
  };

  public downloadPDF = async (req: Request, res: Response): Promise<void> => {
    try {
      const queryOrBody = { ...req.query, ...req.body };
      let { messageId, attachmentId, accessToken, filename } = queryOrBody as any;
      
      const clientId = queryOrBody.clientId || process.env.GOOGLE_CLIENT_ID;
      const clientSecret = queryOrBody.clientSecret || process.env.GOOGLE_CLIENT_SECRET;

      // Fallback to Authorization Header for accessToken
      if (!accessToken && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
          accessToken = parts[1];
        }
      }

      // Basic validation
      if (!messageId || !attachmentId) {
        res.status(400).json({
          userMessage: 'Parámetros messageId o attachmentId no proporcionados.',
          technicalError: 'Missing required parameters: messageId and attachmentId must be provided in query parameters or body',
        });
        return;
      }
      if (!accessToken) {
        res.status(400).json({
          userMessage: 'Token de acceso no proporcionado.',
          technicalError: 'Missing required parameter: accessToken (must be provided in query/body or in the Authorization Bearer header)',
        });
        return;
      }
      if (!clientId || !clientSecret) {
        res.status(400).json({
          userMessage: 'Credenciales del cliente OAuth (Client ID o Client Secret) no proporcionadas.',
          technicalError: 'Missing required parameters: clientId or clientSecret (must be provided in query/body or configured as environment variables)',
        });
        return;
      }

      console.log(`Downloading PDF for messageId: ${messageId}, attachmentId: ${attachmentId}...`);
      const result = await this.scannerService.downloadInvoicePDF({
        gmailMessageId: messageId,
        gmailAttachmentId: attachmentId,
        accessToken,
        clientId,
        clientSecret,
        targetPdfFilename: filename,
      });

      console.log(`Successfully retrieved PDF attachment: ${result.filename}`);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.buffer);
    } catch (error: any) {
      console.error('Download PDF execution error:', error);
      res.status(500).json({
        userMessage: 'Ocurrió un error al intentar descargar el archivo PDF.',
        technicalError: error.message || String(error),
      });
    }
  };
}
