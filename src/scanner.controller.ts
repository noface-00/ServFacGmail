import { Request, Response } from 'express';
import { ScannerService, ScanRequest, ScanSentRequest } from './scanner.service.js';
import { AccountsService, AccountNotFoundError } from './accounts.service.js';

export class ScannerController {
  private scannerService: ScannerService;
  private accountsService: AccountsService;

  constructor() {
    this.scannerService = new ScannerService();
    this.accountsService = new AccountsService();
  }

  public scan = async (req: Request, res: Response): Promise<void> => {
    try {
      let { accountEmail, supplierEmails, sinceDate, q } = req.body;
      const geminiApiKey = req.body.geminiApiKey || process.env.GEMINI_API_KEY;

      // Basic validation
      if (!accountEmail) {
        res.status(400).json({
          userMessage: 'Cuenta de Gmail no especificada.',
          technicalError: 'Missing required parameter: accountEmail',
        });
        return;
      }

      if (!q) {
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
      }

      const authClient = await this.accountsService.getAuthorizedClient(accountEmail);

      const scanRequest: ScanRequest = {
        authClient,
        supplierEmails,
        sinceDate,
        geminiApiKey,
        q,
      };

      console.log(`Starting scan${q ? ` with query "${q}"` : ` for ${supplierEmails?.length || 0} suppliers`}...`);
      const { facturas, fallidas, truncated } = await this.scannerService.scan(scanRequest);
      console.log(`Scan completed. Found ${facturas.length} valid invoice attachments, ${fallidas.length} failures.`);

      res.status(200).json({
        facturas,
        count: facturas.length,
        fallidas,
        truncated,
      });
    } catch (error: any) {
      if (error instanceof AccountNotFoundError) {
        res.status(404).json({
          userMessage: 'La cuenta de Gmail solicitada no está conectada. Conéctela primero mediante /auth/google/login.',
          technicalError: error.message,
        });
        return;
      }
      console.error('Scan execution error:', error);
      res.status(500).json({
        userMessage: 'Ocurrió un error al escanear la bandeja de entrada. Por favor, intente de nuevo más tarde.',
        technicalError: error.message || String(error),
      });
    }
  };

  public scanSent = async (req: Request, res: Response): Promise<void> => {
    try {
      let { accountEmail, clientEmails, sinceDate, q } = req.body;
      const geminiApiKey = req.body.geminiApiKey || process.env.GEMINI_API_KEY;

      // Basic validation
      if (!accountEmail) {
        res.status(400).json({
          userMessage: 'Cuenta de Gmail no especificada.',
          technicalError: 'Missing required parameter: accountEmail',
        });
        return;
      }

      if (!q) {
        if (!sinceDate) {
          res.status(400).json({
            userMessage: 'Fecha de inicio (sinceDate) no proporcionada.',
            technicalError: 'Missing required parameter: sinceDate is mandatory',
          });
          return;
        }

        if (!clientEmails) {
          const envEmails = process.env.CLIENT_EMAILS;
          if (envEmails) {
            clientEmails = envEmails.split(',').map(email => email.trim());
          } else {
            res.status(400).json({
              userMessage: 'Lista de correos de clientes no proporcionada.',
              technicalError: 'Missing parameter: clientEmails must be provided in the body or configured in the environment variable CLIENT_EMAILS',
            });
            return;
          }
        } else if (!Array.isArray(clientEmails)) {
          res.status(400).json({
            userMessage: 'Lista de correos de clientes no válida.',
            technicalError: 'Invalid parameter: clientEmails must be an array of strings',
          });
          return;
        }
      }

      const authClient = await this.accountsService.getAuthorizedClient(accountEmail);

      const scanSentRequest: ScanSentRequest = {
        authClient,
        clientEmails,
        sinceDate,
        geminiApiKey,
        q,
        accountEmail,
      };

      console.log(`Starting sent scan${q ? ` with query "${q}"` : ` for ${clientEmails?.length || 0} clients`}...`);
      const { facturas, fallidas, truncated } = await this.scannerService.scanSent(scanSentRequest);
      console.log(`Sent scan completed. Found ${facturas.length} valid invoice attachments, ${fallidas.length} failures.`);

      res.status(200).json({
        facturas,
        count: facturas.length,
        fallidas,
        truncated,
      });
    } catch (error: any) {
      if (error instanceof AccountNotFoundError) {
        res.status(404).json({
          userMessage: 'La cuenta de Gmail solicitada no está conectada. Conéctela primero mediante /auth/google/login.',
          technicalError: error.message,
        });
        return;
      }
      console.error('Scan sent execution error:', error);
      res.status(500).json({
        userMessage: 'Ocurrió un error al escanear los correos enviados. Por favor, intente de nuevo más tarde.',
        technicalError: error.message || String(error),
      });
    }
  };

  public downloadPDF = async (req: Request, res: Response): Promise<void> => {
    try {
      const queryOrBody = { ...req.query, ...req.body };
      const { messageId, attachmentId, accountEmail, filename } = queryOrBody as any;

      // Basic validation
      if (!messageId || !attachmentId) {
        res.status(400).json({
          userMessage: 'Parámetros messageId o attachmentId no proporcionados.',
          technicalError: 'Missing required parameters: messageId and attachmentId must be provided in query parameters or body',
        });
        return;
      }
      if (!accountEmail) {
        res.status(400).json({
          userMessage: 'Cuenta de Gmail no especificada.',
          technicalError: 'Missing required parameter: accountEmail',
        });
        return;
      }

      const authClient = await this.accountsService.getAuthorizedClient(accountEmail);

      console.log(`Downloading PDF for messageId: ${messageId}, attachmentId: ${attachmentId}...`);
      const result = await this.scannerService.downloadInvoicePDF({
        gmailMessageId: messageId,
        gmailAttachmentId: attachmentId,
        authClient,
        targetPdfFilename: filename,
      });

      console.log(`Successfully retrieved PDF attachment: ${result.filename}`);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.buffer);
    } catch (error: any) {
      if (error instanceof AccountNotFoundError) {
        res.status(404).json({
          userMessage: 'La cuenta de Gmail solicitada no está conectada. Conéctela primero mediante /auth/google/login.',
          technicalError: error.message,
        });
        return;
      }
      console.error('Download PDF execution error:', error);
      res.status(500).json({
        userMessage: 'Ocurrió un error al intentar descargar el archivo PDF.',
        technicalError: error.message || String(error),
      });
    }
  };
}
