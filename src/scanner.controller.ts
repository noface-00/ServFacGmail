import { Request, Response } from 'express';
import { ScannerService, ScanRequest } from './scanner.service.js';

export class ScannerController {
  private scannerService: ScannerService;

  constructor() {
    this.scannerService = new ScannerService();
  }

  public scan = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accessToken, refreshToken, supplierEmails, sinceDate } = req.body;
      const clientId = req.body.clientId || process.env.GOOGLE_CLIENT_ID;
      const clientSecret = req.body.clientSecret || process.env.GOOGLE_CLIENT_SECRET;

      // Basic validation
      if (!accessToken) {
        res.status(400).json({ error: 'Missing required parameter: accessToken' });
        return;
      }
      if (!clientId || !clientSecret) {
        res.status(400).json({ error: 'Missing required parameters: clientId or clientSecret (must be provided in the body or configured as environment variables)' });
        return;
      }
      if (!supplierEmails || !Array.isArray(supplierEmails)) {
        res.status(400).json({ error: 'Missing or invalid parameter: supplierEmails must be an array of strings' });
        return;
      }

      const scanRequest: ScanRequest = {
        accessToken,
        refreshToken,
        clientId,
        clientSecret,
        supplierEmails,
        sinceDate,
      };

      console.log(`Starting scan for ${supplierEmails.length} suppliers...`);
      const results = await this.scannerService.scanInbox(scanRequest);
      console.log(`Scan completed. Found ${results.length} valid invoice attachments.`);

      res.status(200).json(results);
    } catch (error: any) {
      console.error('Scan execution error:', error);
      res.status(500).json({
        error: 'An error occurred during inbox scanning',
        message: error.message || String(error),
      });
    }
  };
}
