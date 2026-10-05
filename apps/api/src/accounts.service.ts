import { google, Auth } from 'googleapis';
import { prisma } from './prisma.js';
import { encrypt, decrypt } from './crypto.util.js';
import { signState, verifyState } from './oauth-state.js';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export class AccountNotFoundError extends Error {
  constructor(email: string) {
    super(`No GmailAccount found for email: ${email}`);
    this.name = 'AccountNotFoundError';
  }
}

export class InvalidOAuthStateError extends Error {
  constructor() {
    super('OAuth state is missing, invalid or expired');
    this.name = 'InvalidOAuthStateError';
  }
}

export interface AccountSummary {
  email: string;
  connectedAt: Date;
  updatedAt: Date;
}

export class AccountsService {
  private newOAuthClient(): Auth.OAuth2Client {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  public getAuthUrl(): string {
    return this.newOAuthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state: signState(),
    });
  }

  public async handleCallback(code: string, state: string | undefined): Promise<string> {
    if (!verifyState(state)) {
      throw new InvalidOAuthStateError();
    }

    const oauth2Client = this.newOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const email = profile.data.emailAddress;
    if (!email) {
      throw new Error('Could not determine the Gmail account email from the OAuth profile');
    }

    const existing = await prisma.gmailAccount.findUnique({ where: { email } });
    if (!tokens.refresh_token && !existing) {
      throw new Error(
        `Google did not return a refresh_token for ${email}. Revoke access at ` +
          `https://myaccount.google.com/permissions and try connecting again.`,
      );
    }

    // Computed once: `create` is only actually used by Prisma when the account is new, in which
    // case tokens.refresh_token is guaranteed to be present (checked above). Building it eagerly
    // here (rather than inline in `create`) avoids calling encrypt(undefined) on a reconnect.
    const refreshTokenEnc = tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined;

    await prisma.gmailAccount.upsert({
      where: { email },
      create: {
        email,
        accessTokenEnc: encrypt(tokens.access_token!),
        refreshTokenEnc: refreshTokenEnc!,
        accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope,
      },
      update: {
        accessTokenEnc: encrypt(tokens.access_token!),
        accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope,
        ...(refreshTokenEnc ? { refreshTokenEnc } : {}),
      },
    });

    return email;
  }

  public async listAccounts(): Promise<AccountSummary[]> {
    const accounts = await prisma.gmailAccount.findMany({
      select: { email: true, createdAt: true, updatedAt: true },
      orderBy: { email: 'asc' },
    });
    return accounts.map((a) => ({ email: a.email, connectedAt: a.createdAt, updatedAt: a.updatedAt }));
  }

  public async deleteAccount(email: string): Promise<void> {
    try {
      await prisma.gmailAccount.delete({ where: { email } });
    } catch {
      throw new AccountNotFoundError(email);
    }
  }

  public async getAuthorizedClient(email: string): Promise<Auth.OAuth2Client> {
    const account = await prisma.gmailAccount.findUnique({ where: { email } });
    if (!account) {
      throw new AccountNotFoundError(email);
    }

    const oauth2Client = this.newOAuthClient();
    oauth2Client.setCredentials({
      access_token: decrypt(account.accessTokenEnc),
      refresh_token: decrypt(account.refreshTokenEnc),
      expiry_date: account.accessTokenExpiresAt?.getTime(),
    });

    oauth2Client.on('tokens', (tokens) => {
      prisma.gmailAccount
        .update({
          where: { email },
          data: {
            ...(tokens.access_token ? { accessTokenEnc: encrypt(tokens.access_token) } : {}),
            ...(tokens.expiry_date ? { accessTokenExpiresAt: new Date(tokens.expiry_date) } : {}),
            ...(tokens.refresh_token ? { refreshTokenEnc: encrypt(tokens.refresh_token) } : {}),
          },
        })
        .catch((err) => console.error(`Failed to persist refreshed token for ${email}:`, err));
    });

    return oauth2Client;
  }
}
