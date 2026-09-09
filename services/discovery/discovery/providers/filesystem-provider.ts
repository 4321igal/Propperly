import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { DiscoveryPolicy } from '../../../../app/src/domain/types.js';

export interface DiscoveredReference {
  locator: string;
  inferredKind: 'GIT_REPO' | 'FOLDER' | 'UNKNOWN';
  sessionCount: number;
  providerSessionIds: string[];
}

const SEARCH_SUBDIRS = [
  'Documents', 'Projects', 'projects', 'work', 'code', 'src', 'dev',
  'repos', 'workspace', 'git', 'github', 'Code', 'Dev', 'Work',
];

export async function* discoverReferences(
  policy: DiscoveryPolicy,
  workspaceCwd: string,
): AsyncIterable<DiscoveredReference> {
  const seen = new Set<string>();
  const home = os.homedir();

  // Always include CWD and parent directories up to home
  let dir = path.resolve(workspaceCwd);
  while (dir !== home && dir !== path.dirname(dir)) {
    if (!seen.has(dir)) {
      const ref = await probeDirectory(dir);
      if (ref) { seen.add(dir); yield ref; }
    }
    dir = path.dirname(dir);
  }

  if (policy.providers.includes('filesystem')) {
    let found = seen.size;

    // Scan home subdirs up to 2 levels
    const roots = [home, ...SEARCH_SUBDIRS.map(s => path.join(home, s))];
    for (const root of roots) {
      let entries: string[];
      try {
        entries = (await fs.readdir(root)).map(e => path.join(root, e));
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (found >= policy.maxCandidates) return;
        if (seen.has(entry)) continue;
        const ref = await probeDirectory(entry);
        if (ref) { seen.add(entry); found++; yield ref; }
      }
    }
  }
}

async function probeDirectory(dirPath: string): Promise<DiscoveredReference | null> {
  let stat;
  try { stat = await fs.stat(dirPath); } catch { return null; }
  if (!stat.isDirectory()) return null;

  try {
    await fs.stat(path.join(dirPath, '.git'));
    return { locator: dirPath, inferredKind: 'GIT_REPO', sessionCount: 1, providerSessionIds: ['filesystem'] };
  } catch {
    // not a git repo
  }

  return null;
}
