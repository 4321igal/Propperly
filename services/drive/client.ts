import { google } from 'googleapis';
import { getOAuth2ClientForUser } from './oauth.js';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

const GOOGLE_APPS_PREFIX = 'application/vnd.google-apps';

export async function listFiles(
  userId: string,
  parentId?: string,
  pageToken?: string
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const auth = await getOAuth2ClientForUser(userId);
  const drive = google.drive({ version: 'v3', auth });

  const q = parentId
    ? `'${parentId}' in parents and trashed = false`
    : `'root' in parents and trashed = false`;

  const { data } = await drive.files.list({
    q,
    pageToken,
    pageSize: 50,
    fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size)',
  });

  return {
    files: (data.files ?? []) as DriveFile[],
    nextPageToken: data.nextPageToken ?? undefined,
  };
}

export async function readFile(
  userId: string,
  fileId: string
): Promise<{ content: string; mimeType: string }> {
  const auth = await getOAuth2ClientForUser(userId);
  const drive = google.drive({ version: 'v3', auth });

  const { data: meta } = await drive.files.get({ fileId, fields: 'mimeType, name' });
  const mimeType = meta.mimeType ?? 'application/octet-stream';

  if (mimeType.startsWith(GOOGLE_APPS_PREFIX)) {
    const exportMime =
      mimeType === `${GOOGLE_APPS_PREFIX}.spreadsheet` ? 'text/csv' : 'text/plain';
    const { data } = await drive.files.export(
      { fileId, mimeType: exportMime },
      { responseType: 'text' }
    );
    return { content: String(data), mimeType: exportMime };
  }

  if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    return { content: `[Binary file — ${mimeType} cannot be read as text]`, mimeType };
  }

  const { data } = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' }
  );
  return { content: String(data), mimeType };
}

export async function searchFiles(
  userId: string,
  query: string,
  pageToken?: string
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const auth = await getOAuth2ClientForUser(userId);
  const drive = google.drive({ version: 'v3', auth });

  const safeQuery = query.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const { data } = await drive.files.list({
    q: `fullText contains '${safeQuery}' and trashed = false`,
    pageToken,
    pageSize: 20,
    fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size)',
  });

  return {
    files: (data.files ?? []) as DriveFile[],
    nextPageToken: data.nextPageToken ?? undefined,
  };
}
