import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { InspectionResult, ExternalIdentity } from '../../../app/src/domain/types.js';

export type { InspectionResult };
export type SourceKind = 'GIT_REPO' | 'FOLDER' | 'UNKNOWN';

const execFileAsync = promisify(execFile);

export async function inspectSourceCandidate(
  locator: string,
  kind: SourceKind,
): Promise<InspectionResult> {
  switch (kind) {
    case 'GIT_REPO': return inspectRepo(locator);
    case 'FOLDER':   return inspectFolder(locator);
    default:
      return { locator, kind: 'UNKNOWN', availability: 'UNKNOWN', support: 'UNSUPPORTED', identityEvidence: [] };
  }
}

async function inspectRepo(locator: string): Promise<InspectionResult> {
  const absPath = path.resolve(locator);
  let stat;
  try {
    stat = await fs.stat(absPath);
  } catch {
    return { locator, kind: 'GIT_REPO', availability: 'INACCESSIBLE', support: 'UNKNOWN', identityEvidence: [] };
  }
  if (!stat.isDirectory()) {
    return { locator, kind: 'GIT_REPO', availability: 'INACCESSIBLE', support: 'UNSUPPORTED', identityEvidence: [] };
  }

  try {
    await fs.stat(path.join(absPath, '.git'));
  } catch {
    return { locator, kind: 'GIT_REPO', availability: 'AVAILABLE', support: 'UNSUPPORTED', identityEvidence: [] };
  }

  const identityEvidence: ExternalIdentity[] = [];
  try {
    const { stdout } = await execFileAsync('git', ['-C', absPath, 'remote', '-v'], { timeout: 5000 });
    const fetchLine = stdout.split('\n').find(l => l.includes('(fetch)'));
    if (fetchLine) {
      const match = fetchLine.match(/^\S+\s+(\S+)\s+\(fetch\)/);
      if (match) {
        identityEvidence.push({ provider: 'git-remote', value: match[1], confidence: 'STRONG' });
      }
    }
  } catch {
    // no remote — valid repo without remote
  }

  return { locator, kind: 'GIT_REPO', availability: 'AVAILABLE', support: 'SUPPORTED', identityEvidence };
}

async function inspectFolder(locator: string): Promise<InspectionResult> {
  const absPath = path.resolve(locator);
  let stat;
  try {
    stat = await fs.stat(absPath);
  } catch {
    return { locator, kind: 'FOLDER', availability: 'INACCESSIBLE', support: 'UNKNOWN', identityEvidence: [] };
  }
  if (!stat.isDirectory()) {
    return { locator, kind: 'FOLDER', availability: 'INACCESSIBLE', support: 'UNSUPPORTED', identityEvidence: [] };
  }
  try {
    await fs.readdir(absPath);
  } catch {
    return { locator, kind: 'FOLDER', availability: 'INACCESSIBLE', support: 'UNSUPPORTED', identityEvidence: [] };
  }
  return { locator, kind: 'FOLDER', availability: 'AVAILABLE', support: 'SUPPORTED', identityEvidence: [] };
}
