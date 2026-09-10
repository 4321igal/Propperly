import { Octokit } from '@octokit/rest';
import { prisma } from '../db/client.js';
import { assertGitRef } from '../security/path-guard.js';

export interface Repo {
  fullName: string;
  description: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  language: string | null;
}

export interface CodeResult {
  path: string;
  repo: string;
  url: string;
  score: number;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

// Throws if owner/org is not in the allowlist (when GITHUB_ORG_ALLOWLIST is set).
function checkOrgAllowlist(ownerOrOrg: string): void {
  const allowlist = process.env.GITHUB_ORG_ALLOWLIST;
  if (!allowlist) return;
  const allowed = allowlist.split(',').map((s) => s.trim().toLowerCase());
  const org = ownerOrOrg.split('/')[0].toLowerCase();
  if (!allowed.includes(org)) {
    throw new Error(`Organization "${org}" is not in GITHUB_ORG_ALLOWLIST`);
  }
}

async function getOctokit(userId: string): Promise<Octokit> {
  const record = await prisma.gitHubToken.findUnique({ where: { userId } });
  if (!record) {
    throw new Error(`No GitHub token for user "${userId}" — visit /oauth/github/authorize first`);
  }
  return new Octokit({ auth: record.accessToken });
}

export async function listRepos(
  userId: string,
  options: { org?: string; page?: number; perPage?: number }
): Promise<{ repos: Repo[] }> {
  const octokit = await getOctokit(userId);

  let raw: Awaited<ReturnType<typeof octokit.repos.listForAuthenticatedUser>>['data'];

  if (options.org) {
    assertGitRef(options.org, 'org');
    checkOrgAllowlist(options.org);
    const { data } = await octokit.repos.listForOrg({
      org: options.org,
      type: 'all',
      page: options.page ?? 1,
      per_page: options.perPage ?? 30,
    });
    raw = data as typeof raw;
  } else {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      page: options.page ?? 1,
      per_page: options.perPage ?? 30,
      sort: 'updated',
    });
    raw = data;
  }

  return {
    repos: raw.map((r) => ({
      fullName: r.full_name,
      description: r.description ?? '',
      private: r.private,
      defaultBranch: r.default_branch,
      updatedAt: r.updated_at ?? '',
      language: r.language ?? null,
    })),
  };
}

export async function searchCode(
  userId: string,
  query: string,
  options: { repo?: string; org?: string; page?: number }
): Promise<{ items: CodeResult[]; totalCount: number }> {
  const octokit = await getOctokit(userId);

  let q = query;
  if (options.repo) {
    assertGitRef(options.repo.split('/')[0], 'repo owner');
    assertGitRef(options.repo.split('/')[1] ?? options.repo, 'repo name');
    checkOrgAllowlist(options.repo);
    q += ` repo:${options.repo}`;
  } else if (options.org) {
    assertGitRef(options.org, 'org');
    checkOrgAllowlist(options.org);
    q += ` org:${options.org}`;
  }

  const { data } = await octokit.search.code({
    q,
    page: options.page ?? 1,
    per_page: 20,
  });

  return {
    totalCount: data.total_count,
    items: data.items.map((item) => ({
      path: item.path,
      repo: item.repository.full_name,
      url: item.html_url,
      score: item.score,
    })),
  };
}

export async function getPrDiff(
  userId: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<{ diff: string; title: string; state: string }> {
  assertGitRef(owner, 'owner');
  assertGitRef(repo, 'repo');
  checkOrgAllowlist(owner);
  const octokit = await getOctokit(userId);

  const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: pullNumber });

  // Fetch diff via raw Accept header
  const diffRes = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
    owner,
    repo,
    pull_number: pullNumber,
    headers: { accept: 'application/vnd.github.diff' },
  });

  return {
    diff: String(diffRes.data),
    title: pr.title,
    state: pr.state,
  };
}

export async function getCommitHistory(
  userId: string,
  owner: string,
  repo: string,
  options: { branch?: string; page?: number; perPage?: number }
): Promise<{ commits: Commit[] }> {
  assertGitRef(owner, 'owner');
  assertGitRef(repo, 'repo');
  checkOrgAllowlist(owner);
  const octokit = await getOctokit(userId);

  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    sha: options.branch,
    page: options.page ?? 1,
    per_page: options.perPage ?? 20,
  });

  return {
    commits: data.map((c) => ({
      sha: c.sha.slice(0, 8),
      message: c.commit.message.split('\n')[0], // subject line only
      author: c.commit.author?.name ?? 'Unknown',
      date: c.commit.author?.date ?? '',
      url: c.html_url,
    })),
  };
}
