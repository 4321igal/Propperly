// All data access flows through Services — MCP never calls Engine, Data Center,
// or Storage directly. See ../../CONTRACT.md.

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

export interface DriveListResult {
  files: DriveFile[];
  nextPageToken?: string;
}

export interface DriveReadResult {
  content: string;
  mimeType: string;
}

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

export interface LocalFileMeta {
  id: string;
  name: string;
  relativePath: string;
  sizeBytes: string;
  mimeType: string;
  updatedAt: string;
}

export interface ServicesClient {
  userId: string | undefined;
  ping(): Promise<{ status: string }>;
  drive: {
    listFiles(params: { parentId?: string; pageToken?: string }): Promise<DriveListResult>;
    readFile(fileId: string): Promise<DriveReadResult>;
    searchFiles(query: string, pageToken?: string): Promise<DriveListResult>;
  };
  git: {
    listRepos(params: { org?: string; page?: number; perPage?: number }): Promise<{ repos: Repo[] }>;
    searchCode(query: string, params: { repo?: string; org?: string; page?: number }): Promise<{ items: CodeResult[]; totalCount: number }>;
    getPrDiff(owner: string, repo: string, pullNumber: number): Promise<{ diff: string; title: string; state: string }>;
    getCommitHistory(owner: string, repo: string, params: { branch?: string; page?: number; perPage?: number }): Promise<{ commits: Commit[] }>;
  };
  local: {
    listFiles(params: { folder?: string }): Promise<{ files: LocalFileMeta[] }>;
    readFile(fileId: string): Promise<{ content: string; mimeType: string; name: string }>;
    searchFiles(query: string): Promise<{ files: { id: string; name: string; relativePath: string; mimeType: string }[] }>;
  };
  sessions: {
    search(query: string, limit?: number): Promise<{
      sessions: { id: string; tool: string; title: string | null; snippet: string; sessionDate: string }[];
    }>;
    getActivity(): Promise<{
      totalSessions: number;
      byTool: Record<string, number>;
      recentSessions: { id: string; tool: string; title: string | null; sessionDate: string }[];
    }>;
  };
}

export function createServicesClient(userId?: string): ServicesClient {
  const baseUrl = process.env.SERVICES_URL ?? 'http://localhost:3001';
  const internalKey = process.env.INTERNAL_API_KEY ?? '';

  async function get(path: string, params: Record<string, string> = {}): Promise<unknown> {
    const url = new URL(path, baseUrl);
    if (userId) url.searchParams.set('userId', userId);
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { 'x-internal-key': internalKey },
    });
    if (!res.ok) throw new Error(`Services ${res.status}: ${await res.text()}`);
    return res.json();
  }

  function requireUserId(): string {
    if (!userId) throw new Error('This tool requires authentication — use Authorization: Bearer <jwt>');
    return userId;
  }

  return {
    userId,

    async ping() {
      return get('/health') as Promise<{ status: string }>;
    },

    drive: {
      async listFiles({ parentId, pageToken }) {
        requireUserId();
        return get('/api/drive/files', {
          ...(parentId ? { parentId } : {}),
          ...(pageToken ? { pageToken } : {}),
        }) as Promise<DriveListResult>;
      },

      async readFile(fileId) {
        requireUserId();
        return get(`/api/drive/files/${fileId}/content`) as Promise<DriveReadResult>;
      },

      async searchFiles(query, pageToken) {
        requireUserId();
        return get('/api/drive/search', {
          q: query,
          ...(pageToken ? { pageToken } : {}),
        }) as Promise<DriveListResult>;
      },
    },

    git: {
      async listRepos({ org, page, perPage }) {
        requireUserId();
        return get('/api/git/repos', {
          ...(org ? { org } : {}),
          ...(page ? { page: String(page) } : {}),
          ...(perPage ? { perPage: String(perPage) } : {}),
        }) as Promise<{ repos: Repo[] }>;
      },

      async searchCode(query, { repo, org, page } = {}) {
        requireUserId();
        return get('/api/git/search', {
          q: query,
          ...(repo ? { repo } : {}),
          ...(org ? { org } : {}),
          ...(page ? { page: String(page) } : {}),
        }) as Promise<{ items: CodeResult[]; totalCount: number }>;
      },

      async getPrDiff(owner, repo, pullNumber) {
        requireUserId();
        return get(`/api/git/repos/${owner}/${repo}/pulls/${pullNumber}/diff`) as Promise<{ diff: string; title: string; state: string }>;
      },

      async getCommitHistory(owner, repo, { branch, page, perPage } = {}) {
        requireUserId();
        return get(`/api/git/repos/${owner}/${repo}/commits`, {
          ...(branch ? { branch } : {}),
          ...(page ? { page: String(page) } : {}),
          ...(perPage ? { perPage: String(perPage) } : {}),
        }) as Promise<{ commits: Commit[] }>;
      },
    },

    local: {
      async listFiles({ folder } = {}) {
        requireUserId();
        return get('/api/local/files', {
          ...(folder ? { folder } : {}),
        }) as Promise<{ files: LocalFileMeta[] }>;
      },

      async readFile(fileId) {
        requireUserId();
        return get(`/api/local/files/${fileId}/content`) as Promise<{ content: string; mimeType: string; name: string }>;
      },

      async searchFiles(query) {
        requireUserId();
        return get('/api/local/search', { q: query }) as Promise<{ files: { id: string; name: string; relativePath: string; mimeType: string }[] }>;
      },
    },

    sessions: {
      async search(query, limit) {
        requireUserId();
        return get('/api/sessions/search', {
          q: query,
          ...(limit ? { limit: String(limit) } : {}),
        }) as Promise<{ sessions: { id: string; tool: string; title: string | null; snippet: string; sessionDate: string }[] }>;
      },

      async getActivity() {
        requireUserId();
        return get('/api/sessions/activity') as Promise<{
          totalSessions: number;
          byTool: Record<string, number>;
          recentSessions: { id: string; tool: string; title: string | null; sessionDate: string }[];
        }>;
      },
    },
  };
}
