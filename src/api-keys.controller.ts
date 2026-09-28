import { Request, Response } from 'express';
import { ApiKeysService, ApiKeyNotFoundError } from './api-keys.service.js';

export class ApiKeysController {
  private apiKeysService: ApiKeysService;

  constructor() {
    this.apiKeysService = new ApiKeysService();
  }

  public create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, allowedAccounts } = req.body;
      const { key, summary } = await this.apiKeysService.createKey(name, allowedAccounts ?? []);
      res.status(201).json({
        userMessage: 'Clave creada. Guárdela ahora: no se volverá a mostrar.',
        key,
        apiKey: summary,
      });
    } catch (error: any) {
      console.error('Failed to create API key:', error);
      res.status(500).json({
        userMessage: 'Ocurrió un error al crear la clave de API.',
        technicalError: error.message || String(error),
      });
    }
  };

  public list = async (req: Request, res: Response): Promise<void> => {
    try {
      const apiKeys = await this.apiKeysService.listKeys();
      res.status(200).json({ apiKeys, count: apiKeys.length });
    } catch (error: any) {
      console.error('Failed to list API keys:', error);
      res.status(500).json({
        userMessage: 'Ocurrió un error al obtener las claves de API.',
        technicalError: error.message || String(error),
      });
    }
  };

  public revoke = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      await this.apiKeysService.revokeKey(id);
      res.status(200).json({ userMessage: 'Clave revocada correctamente.', id });
    } catch (error: any) {
      if (error instanceof ApiKeyNotFoundError) {
        res.status(404).json({
          userMessage: 'La clave de API indicada no existe.',
          technicalError: error.message,
        });
        return;
      }
      console.error('Failed to revoke API key:', error);
      res.status(500).json({
        userMessage: 'Ocurrió un error al revocar la clave de API.',
        technicalError: error.message || String(error),
      });
    }
  };
}
