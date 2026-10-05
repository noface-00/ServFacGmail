import { Request, Response } from 'express';
import { AccountsService, AccountNotFoundError, InvalidOAuthStateError } from './accounts.service.js';
import { isAccountAllowed } from './auth.middleware.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family: sans-serif; text-align: center; padding-top: 4rem;">
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(message)}</p>
</body>
</html>`;
}

export class AccountsController {
  private accountsService: AccountsService;

  constructor() {
    this.accountsService = new AccountsService();
  }

  public login = (req: Request, res: Response): void => {
    try {
      const authUrl = this.accountsService.getAuthUrl();
      res.status(200).json({ authUrl });
    } catch (error: any) {
      console.error('Failed to build the Google OAuth login URL:', error);
      res.status(500).json({
        userMessage: 'Ocurrió un error al iniciar la conexión con Google.',
        technicalError: error.message || String(error),
      });
    }
  };

  public callback = async (req: Request, res: Response): Promise<void> => {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

    if (error) {
      res.status(400).send(htmlPage('Autorización cancelada', 'No se completó la conexión de la cuenta de Gmail.'));
      return;
    }

    if (!code) {
      res.status(400).send(htmlPage('Solicitud inválida', 'Falta el parámetro "code" en la respuesta de Google.'));
      return;
    }

    try {
      const email = await this.accountsService.handleCallback(code, state);
      res
        .status(200)
        .send(htmlPage('Cuenta conectada', `La cuenta ${email} fue conectada correctamente. Ya puede cerrar esta ventana.`));
    } catch (err: any) {
      if (err instanceof InvalidOAuthStateError) {
        res
          .status(400)
          .send(htmlPage('Enlace expirado', 'El enlace de autorización expiró o no es válido. Solicite uno nuevo.'));
        return;
      }
      console.error('Google OAuth callback error:', err);
      res
        .status(500)
        .send(htmlPage('Error de conexión', 'Ocurrió un error al conectar la cuenta de Gmail. Intente de nuevo más tarde.'));
    }
  };

  public list = async (req: Request, res: Response): Promise<void> => {
    try {
      const all = await this.accountsService.listAccounts();
      // Keys restricted to specific accounts only see those accounts.
      const accounts = all.filter((account) => isAccountAllowed(req.auth, account.email));
      res.status(200).json({ accounts, count: accounts.length });
    } catch (error: any) {
      console.error('Failed to list connected accounts:', error);
      res.status(500).json({
        userMessage: 'Ocurrió un error al obtener las cuentas conectadas.',
        technicalError: error.message || String(error),
      });
    }
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.params;
    try {
      await this.accountsService.deleteAccount(email);
      res.status(200).json({ userMessage: 'Cuenta desconectada correctamente.', email });
    } catch (error: any) {
      if (error instanceof AccountNotFoundError) {
        res.status(404).json({
          userMessage: 'La cuenta indicada no está conectada.',
          technicalError: error.message,
        });
        return;
      }
      console.error('Failed to delete account:', error);
      res.status(500).json({
        userMessage: 'Ocurrió un error al desconectar la cuenta.',
        technicalError: error.message || String(error),
      });
    }
  };
}
