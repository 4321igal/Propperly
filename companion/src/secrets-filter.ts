// Best-effort secrets scrubbing before any content leaves the user's machine.
// Replaces matched secrets with [REDACTED]. False negatives are preferable to
// blocking legitimate content; the patterns target well-known key formats only.

const PATTERNS: RegExp[] = [
  // Anthropic
  /sk-ant-api\d{2}-[A-Za-z0-9_\-]{20,}/g,
  // OpenAI / generic sk- keys
  /sk-(?:proj-)?[A-Za-z0-9]{20,}/g,
  // AWS access key ID
  /AKIA[0-9A-Z]{16}/g,
  // AWS secret (often in config lines)
  /aws_secret_access_key\s*[=:]\s*[A-Za-z0-9/+=]{30,}/gi,
  // GitHub tokens
  /ghp_[A-Za-z0-9]{36}/g,
  /ghs_[A-Za-z0-9]{36}/g,
  /github_pat_[A-Za-z0-9_]{82}/g,
  // Full JWT  (header.payload.sig — all three segments)
  /eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g,
  // PEM private keys
  /-----BEGIN(?:\s+[A-Z]+)?\s+PRIVATE KEY-----[\s\S]*?-----END(?:\s+[A-Z]+)?\s+PRIVATE KEY-----/g,
  // Passwords embedded in connection strings
  /:\/\/[^:@\s/]{1,64}:[^@\s/]{4,128}@/g,
  // Explicit password / secret / api_key assignment (value ≥ 8 chars)
  /\b(?:password|passwd|api[_\-]?key|api[_\-]?secret|client[_\-]?secret)\s*[=:'"]\s*\S{8,}/gi,
];

export interface FilterResult {
  filtered: string;
  redactedCount: number;
}

export function filterSecrets(content: string): FilterResult {
  let filtered = content;
  let redactedCount = 0;

  for (const re of PATTERNS) {
    re.lastIndex = 0;
    filtered = filtered.replace(re, () => { redactedCount++; return '[REDACTED]'; });
  }

  return { filtered, redactedCount };
}

// Files that should never be uploaded regardless of the whitelist
const SENSITIVE_FILENAMES = new Set([
  '.env', '.env.local', '.env.production', '.env.development',
  'credentials', 'credentials.json', 'service-account.json',
  'id_rsa', 'id_ed25519', 'id_ecdsa', '.netrc',
]);

export function isSensitiveFile(name: string): boolean {
  return SENSITIVE_FILENAMES.has(name.toLowerCase());
}
