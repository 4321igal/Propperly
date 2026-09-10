import { signJwt } from '../auth/jwt.js';
import { prisma } from '../db/client.js';
import { resolveTenantId } from '../tenant/db.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';

const SCOPES = 'repo read:org read:user';

export function getGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID ?? '',
    scope: SCOPES,
    state,
    ...(process.env.GITHUB_REDIRECT_URI ? { redirect_uri: process.env.GITHUB_REDIRECT_URI } : {}),
  });
  return `${GITHUB_AUTH_URL}?${params}`;
}

export async function exchangeGitHubCode(
  code: string
): Promise<{ userId: string; githubLogin: string }> {
  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenRes.json()) as { access_token: string; scope: string; error?: string };
  if (tokenData.error || !tokenData.access_token) {
    throw new Error(`GitHub token exchange failed: ${tokenData.error ?? 'no access_token'}`);
  }

  const userRes = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'Propperly-MCP/1.0',
    },
  });
  const userData = (await userRes.json()) as { login: string };

  const userId = userData.login;

  const tenantId = resolveTenantId();
  await prisma.gitHubToken.upsert({
    where: { userId },
    update: { githubLogin: userId, accessToken: tokenData.access_token, scopes: tokenData.scope, ...(tenantId ? { tenantId } : {}) },
    create: { userId, githubLogin: userId, accessToken: tokenData.access_token, scopes: tokenData.scope, ...(tenantId ? { tenantId } : {}) },
  });

  return { userId, githubLogin: userId };
}

export async function issueGitHubJwt(userId: string, githubLogin: string): Promise<string> {
  const tenantId = resolveTenantId();
  return signJwt(userId, { githubLogin, ...(tenantId ? { tenantId } : {}) });
}
