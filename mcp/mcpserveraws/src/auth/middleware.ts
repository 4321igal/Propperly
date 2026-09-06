// Transport-level auth for the HTTP listener. This guards access to the MCP
// endpoint itself — it is not, and must not become, Services' authorization/
// policy logic (see ../../README.md, "Not allowed to do").

import type { Request, Response, NextFunction } from "express";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.MCP_API_KEY;

  if (!expected) {
    // No key configured: auth is a deployment-time decision, not a default.
    next();
    return;
  }

  const provided = req.header("x-mcp-api-key");
  if (provided !== expected) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  next();
}
