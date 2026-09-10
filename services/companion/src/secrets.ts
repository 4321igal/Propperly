const PATTERNS: RegExp[] = [
  // AWS access key ID
  /AKIA[0-9A-Z]{16}/g,
  // AWS secret access key (labelled)
  /(?:aws[_-]?secret[_-]?access[_-]?key)\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
  // GitHub tokens
  /gh[op]_[A-Za-z0-9]{36,}/g,
  /github_pat_[A-Za-z0-9_]{82}/g,
  // OpenAI
  /sk-[A-Za-z0-9\-_]{20,}/g,
  // Anthropic
  /sk-ant-[A-Za-z0-9\-_]{90,}/g,
  // JWT tokens
  /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g,
  // Generic labelled secrets (api_key, token, secret, password followed by a value)
  /(?:api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token|bearer|password)\s*[:=]\s*['"]?([A-Za-z0-9_\-./+=]{16,})['"]?/gi,
];

export function filterSecrets(content: string): { text: string; redactedCount: number } {
  let text = content;
  let redactedCount = 0;
  for (const pattern of PATTERNS) {
    const replaced = text.replace(pattern, '[REDACTED]');
    if (replaced !== text) {
      redactedCount++;
      text = replaced;
    }
  }
  return { text, redactedCount };
}
