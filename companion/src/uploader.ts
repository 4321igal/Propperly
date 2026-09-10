import type { CompanionConfig } from './config.js';

export interface FileUploadPayload {
  absolutePath: string;
  relativePath: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  contentHash: string;
  content: string; // base64-encoded
}

export async function uploadFile(
  config: CompanionConfig,
  payload: FileUploadPayload
): Promise<void> {
  const res = await fetch(`${config.servicesUrl}/api/local/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Services ${res.status}: ${msg}`);
  }
}

export async function deleteFile(
  config: CompanionConfig,
  absolutePath: string
): Promise<void> {
  const url = new URL('/api/local/files', config.servicesUrl);
  url.searchParams.set('absolutePath', absolutePath);
  await fetch(url.toString(), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${config.token}` },
  }).catch(() => {
    // best-effort delete
  });
}
