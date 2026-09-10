export const SKIP_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp',
  '.mp4', '.mov', '.avi', '.mkv', '.wmv',
  '.mp3', '.wav', '.flac', '.aac', '.ogg',
  '.zip', '.tar', '.gz', '.bz2', '.rar', '.7z', '.xz',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.db', '.sqlite', '.sqlite3',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
]);

export const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg',
  '__pycache__', '.venv', 'venv', '.env',
  'dist', 'build', 'out', '.next', '.nuxt',
  '.cache', '.parcel-cache', 'coverage',
  '.DS_Store',
]);

const EXT_MIME: Record<string, string> = {
  '.ts': 'text/typescript', '.tsx': 'text/typescript',
  '.js': 'text/javascript', '.jsx': 'text/javascript',
  '.mjs': 'text/javascript', '.cjs': 'text/javascript',
  '.json': 'application/json', '.jsonc': 'application/json',
  '.md': 'text/markdown', '.mdx': 'text/markdown',
  '.txt': 'text/plain', '.csv': 'text/csv',
  '.html': 'text/html', '.htm': 'text/html',
  '.css': 'text/css', '.scss': 'text/css', '.less': 'text/css',
  '.yaml': 'text/yaml', '.yml': 'text/yaml',
  '.toml': 'text/toml', '.ini': 'text/plain', '.cfg': 'text/plain',
  '.py': 'text/x-python', '.go': 'text/x-go', '.rs': 'text/x-rust',
  '.java': 'text/x-java', '.kt': 'text/x-kotlin', '.swift': 'text/x-swift',
  '.c': 'text/x-c', '.cpp': 'text/x-cpp', '.h': 'text/x-c',
  '.sh': 'text/x-sh', '.bash': 'text/x-sh', '.zsh': 'text/x-sh',
  '.ps1': 'text/x-powershell', '.bat': 'text/x-batch',
  '.xml': 'text/xml', '.svg': 'image/svg+xml',
  '.env': 'text/plain', '.gitignore': 'text/plain',
};

export function detectMimeType(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return 'text/plain';
  return EXT_MIME[name.slice(dot).toLowerCase()] ?? 'text/plain';
}

export function isBinaryBuffer(buf: Buffer): boolean {
  // Heuristic: null bytes in the first 8KB indicate binary content
  const sample = buf.slice(0, 8192);
  return sample.includes(0);
}
