import { prisma } from '../db/client.js';

export async function logToolCall(params: {
  userId: string;
  toolName: string;
  inputArgs: Record<string, unknown>;
  resultSummary?: string;
  isError?: boolean;
  durationMs?: number;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      toolName: params.toolName,
      inputArgs: params.inputArgs,
      resultSummary: params.resultSummary,
      isError: params.isError ?? false,
      durationMs: params.durationMs,
    },
  });
}
