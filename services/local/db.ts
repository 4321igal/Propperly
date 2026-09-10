import { randomUUID } from 'node:crypto';
import { prisma } from '../db/client.js';

export interface LocalFileMeta {
  id: string;
  name: string;
  relativePath: string;
  sizeBytes: string;
  mimeType: string;
  updatedAt: Date;
}

export async function upsertLocalFile(params: {
  userId: string;
  absolutePath: string;
  relativePath: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  contentHash: string;
  storageKey: string;
}): Promise<string> {
  const result = await prisma.localFile.upsert({
    where: { userId_absolutePath: { userId: params.userId, absolutePath: params.absolutePath } },
    update: {
      relativePath: params.relativePath,
      name: params.name,
      sizeBytes: BigInt(params.sizeBytes),
      mimeType: params.mimeType,
      contentHash: params.contentHash,
      storageKey: params.storageKey,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      userId: params.userId,
      absolutePath: params.absolutePath,
      relativePath: params.relativePath,
      name: params.name,
      sizeBytes: BigInt(params.sizeBytes),
      mimeType: params.mimeType,
      contentHash: params.contentHash,
      storageKey: params.storageKey,
    },
  });
  return result.id;
}

export async function deleteLocalFile(
  userId: string,
  absolutePath: string
): Promise<string | null> {
  try {
    const record = await prisma.localFile.delete({
      where: { userId_absolutePath: { userId, absolutePath } },
      select: { storageKey: true },
    });
    return record.storageKey;
  } catch {
    return null;
  }
}

export async function listLocalFiles(
  userId: string,
  folder?: string
): Promise<LocalFileMeta[]> {
  const records = await prisma.localFile.findMany({
    where: {
      userId,
      ...(folder ? { relativePath: { startsWith: folder } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
    select: { id: true, name: true, relativePath: true, sizeBytes: true, mimeType: true, updatedAt: true },
  });
  return records.map((r: { id: string; name: string; relativePath: string; sizeBytes: bigint; mimeType: string; updatedAt: Date }) => ({
    ...r,
    sizeBytes: String(r.sizeBytes),
  }));
}

export async function searchLocalFiles(
  userId: string,
  query: string
): Promise<{ id: string; name: string; relativePath: string; mimeType: string }[]> {
  return prisma.localFile.findMany({
    where: {
      userId,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { relativePath: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 30,
    select: { id: true, name: true, relativePath: true, mimeType: true },
  });
}

export async function getLocalFileMeta(
  userId: string,
  fileId: string
): Promise<{ storageKey: string; mimeType: string; name: string } | null> {
  return prisma.localFile.findFirst({
    where: { id: fileId, userId },
    select: { storageKey: true, mimeType: true, name: true },
  });
}
