import rateLimit from 'express-rate-limit';

const json = (msg: string) => ({ error: msg });

// Public OAuth endpoints — tight limit to prevent abuse.
export const oauthLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: json('too many requests — try again in a minute'),
});

// Companion upload endpoints — higher volume of small uploads is expected.
export const uploadLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: json('upload rate limit exceeded'),
});

// Catch-all applied to every route as a safety net.
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: json('too many requests'),
});
