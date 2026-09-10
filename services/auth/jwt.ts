import { SignJWT } from 'jose';

const getSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET ?? 'insecure-dev-secret');

export async function signJwt(
  subject: string,
  claims: Record<string, unknown> = {}
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}
