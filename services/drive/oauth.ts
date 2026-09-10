import { google } from 'googleapis';
import { signJwt } from '../auth/jwt.js';
import { prisma } from '../db/client.js';
import { resolveTenantId } from '../tenant/db.js';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

function makeOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthorizationUrl(state: string): string {
  return makeOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent',
  });
}

export async function exchangeCodeForTokens(code: string): Promise<{ userId: string; email: string }> {
  const client = makeOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();
  const userId = data.id!;
  const email = data.email!;

  const tenantId = resolveTenantId();
  await prisma.userToken.upsert({
    where: { userId },
    update: {
      email,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      ...(tenantId ? { tenantId } : {}),
    },
    create: {
      userId,
      email,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      ...(tenantId ? { tenantId } : {}),
    },
  });

  return { userId, email };
}

export async function getOAuth2ClientForUser(userId: string) {
  const record = await prisma.userToken.findUnique({ where: { userId } });
  if (!record) {
    throw new Error(`No OAuth tokens for user ${userId} — visit /oauth/google/authorize first`);
  }

  const client = makeOAuth2Client();
  client.setCredentials({
    access_token: record.accessToken,
    refresh_token: record.refreshToken ?? undefined,
    expiry_date: record.expiresAt?.getTime(),
  });

  client.on('tokens', async (newTokens) => {
    await prisma.userToken.update({
      where: { userId },
      data: {
        accessToken: newTokens.access_token ?? record.accessToken,
        expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined,
      },
    });
  });

  return client;
}

export async function issueJwt(userId: string, email: string): Promise<string> {
  const tenantId = resolveTenantId();
  return signJwt(userId, { email, ...(tenantId ? { tenantId } : {}) });
}
