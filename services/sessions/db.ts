import { prisma } from '../db/client.js';

export interface SessionRecord {
  id: string;
  tool: string;
  title: string | null;
  snippet: string;
  sessionDate: Date;
  sizeBytes: number;
}

export async function upsertSession(params: {
  userId: string;
  sessionPath: string;
  tool: string;
  title: string;
  content: string;  // already filtered; we store up to 10KB for search
  contentHash: string;
  sizeBytes: number;
  sessionDate: Date;
}): Promise<string> {
  const SEARCH_LIMIT = 10_000;
  const snippet = params.content.slice(0, 500);
  const contentStored = params.content.slice(0, SEARCH_LIMIT);

  const record = await prisma.session.upsert({
    where: { userId_sessionPath: { userId: params.userId, sessionPath: params.sessionPath } },
    update: {
      tool: params.tool,
      title: params.title,
      snippet,
      contentStored,
      contentHash: params.contentHash,
      sizeBytes: params.sizeBytes,
      sessionDate: params.sessionDate,
      updatedAt: new Date(),
    },
    create: {
      userId: params.userId,
      sessionPath: params.sessionPath,
      tool: params.tool,
      title: params.title,
      snippet,
      contentStored,
      contentHash: params.contentHash,
      sizeBytes: params.sizeBytes,
      sessionDate: params.sessionDate,
    },
    select: { id: true },
  });
  return record.id;
}

export async function searchSessions(
  userId: string,
  query: string,
  limit = 20
): Promise<{ id: string; tool: string; title: string | null; snippet: string; sessionDate: Date }[]> {
  return prisma.session.findMany({
    where: {
      userId,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { contentStored: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { sessionDate: 'desc' },
    take: limit,
    select: { id: true, tool: true, title: true, snippet: true, sessionDate: true },
  });
}

export async function getRecentActivity(userId: string): Promise<{
  totalSessions: number;
  byTool: Record<string, number>;
  recentSessions: { id: string; tool: string; title: string | null; sessionDate: Date }[];
}> {
  const [totalSessions, grouped, recentSessions] = await Promise.all([
    prisma.session.count({ where: { userId } }),

    prisma.session.groupBy({
      by: ['tool'],
      where: { userId },
      _count: { tool: true },
    }),

    prisma.session.findMany({
      where: { userId },
      orderBy: { sessionDate: 'desc' },
      take: 10,
      select: { id: true, tool: true, title: true, sessionDate: true },
    }),
  ]);

  const byTool: Record<string, number> = {};
  for (const g of grouped) byTool[g.tool] = g._count.tool;

  return { totalSessions, byTool, recentSessions };
}
