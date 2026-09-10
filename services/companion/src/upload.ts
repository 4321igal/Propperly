import { createHash } from 'node:crypto';

export interface UploadClient {
  uploadFile(params: {
    absolutePath: string;
    relativePath: string;
    name: string;
    content: Buffer;
    mimeType?: string;
  }): Promise<void>;

  deleteFile(absolutePath: string): Promise<void>;

  uploadSession(params: {
    sessionPath: string;
    tool: string;
    title: string;
    content: string;
    sessionDate: Date;
  }): Promise<void>;
}

export function createUploadClient(serverUrl: string, token: string): UploadClient {
  const base = serverUrl.replace(/\/$/, '');
  const authHeader = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function post(path: string, body: unknown): Promise<void> {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`POST ${path} → ${res.status}: ${msg}`);
    }
  }

  return {
    async uploadFile({ absolutePath, relativePath, name, content, mimeType }) {
      await post('/api/local/files', {
        absolutePath,
        relativePath,
        name,
        content: content.toString('base64'),
        contentHash: createHash('sha256').update(content).digest('hex'),
        mimeType: mimeType ?? 'text/plain',
        sizeBytes: String(content.length),
      });
    },

    async deleteFile(absolutePath) {
      const url = `${base}/api/local/files?absolutePath=${encodeURIComponent(absolutePath)}`;
      const res = await fetch(url, { method: 'DELETE', headers: authHeader });
      if (!res.ok && res.status !== 404) {
        throw new Error(`DELETE /api/local/files → ${res.status}`);
      }
    },

    async uploadSession({ sessionPath, tool, title, content, sessionDate }) {
      await post('/api/sessions', {
        sessionPath,
        tool,
        title,
        content,
        contentHash: createHash('sha256').update(content).digest('hex'),
        sizeBytes: String(Buffer.byteLength(content, 'utf-8')),
        sessionDate: sessionDate.toISOString(),
      });
    },
  };
}
