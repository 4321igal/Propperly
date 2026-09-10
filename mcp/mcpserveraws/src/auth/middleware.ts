// Transport-level auth for the HTTP listener. JWT bearer tokens are issued by
// Services after Google OAuth. API-key fallback remains for non-Drive tools.

import type { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}

const getJwtSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET ?? 'insecure-dev-secret');

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const { payload } = await jwtVerify(token, getJwtSecret());
      req.user = { userId: payload.sub!, email: payload['email'] as string };
      next();
      return;
    } catch {
      res.status(401).json({ error: 'invalid token' });
      return;
    }
  }

  // API-key fallback (no user context — Drive tools will reject gracefully)
  const expected = process.env.MCP_API_KEY;
  if (expected) {
    if (req.header('x-mcp-api-key') !== expected) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
  }

  next();
}

export { authMiddleware as apiKeyAuth };
