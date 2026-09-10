Stack טכני מומלץ

MCP SDK: @modelcontextprotocol/sdk (הרשמי, TypeScript-first)
Server framework: Express או Fastify עבור ה-HTTP transport (Streamable HTTP)
Auth: openid-client או @azure/msal-node לחיבור ל-SSO ארגוני
Storage: AWS SDK v3 (@aws-sdk/client-s3) או Azure Blob SDK
DB לניהול הרשאות/audit: PostgreSQL + Prisma (type-safe, מתאים ל-TS)
Companion agent: Node.js תהליך עצמאי (יכול לרוץ כ-pkg/nexe binary קרוס-פלטפורמה, או Electron background process אם רוצים UI)
Monorepo tooling: Turborepo או Nx — כי יש כאן כמה חבילות (core server, כל adapter, companion agent)

מבנה הפרויקט (monorepo)

mcp-org-server/
├── packages/
│   ├── core/              # ה-MCP server הראשי, routing, auth
│   ├── adapter-git/       # GitHub/GitLab API integration
│   ├── adapter-drive/     # Google Drive / OneDrive
│   ├── adapter-local/     # ממשק ל-companion agent
│   ├── adapter-logs/      # ניתוח logs של Claude/IDE
│   └── shared/            # types, utils משותפים
├── services/
│   └── companion-agent/   # תהליך שרץ על מחשב המשתמש
└── turbo.json

Phase 0 — הכנה (שבוע 1)

הקמת monorepo (Turborepo), CI בסיסי (GitHub Actions)
הגדרת TypeScript config משותף, ESLint/Prettier
החלטה על auth provider (Azure AD מומלץ אם הארגון כבר ב-Microsoft, אחרת Okta/Auth0)

Phase 1 — Core Server + Drive Adapter (שבועות 2–3)

מימוש MCP server בסיסי עם @modelcontextprotocol/sdk, transport HTTP
Auth middleware: קבלת OAuth token, ולידציה, מיפוי למשתמש
Drive adapter: OAuth flow ל-Google Drive, tools: list_files, read_file, search_drive
Audit logging בסיסי (כל tool call → Postgres)
Deliverable: שרת שרץ, מחובר ל-Claude Desktop, מחזיר קבצים מ-Drive לפי הרשאות המשתמש המחובר

Phase 2 — Git Adapter (שבוע 4)

אינטגרציה עם GitHub API (Octokit.js) / GitLab API
Tools: list_repos, search_code, get_pr_diff, get_commit_history
Scoping: מיפוי בין הרשאות הארגון ב-GitHub להרשאות בשרת שלך

Phase 3 — Companion Agent + Local Files (שבועות 5–7)

בניית companion agent כ-Node process עצמאי
מנגנון "שיתוף" — המשתמש בוחר תיקיות (whitelist), ה-agent סורק ומעלה metadata + תוכן ל-S3/Blob
Sync mechanism — chokidar לניטור שינויים בקבצים, העלאה incremental
Local adapter בשרת המרכזי — tools שקוראים מה-storage, לא מהדיסק ישירות
נקודה קריטית: אריזת ה-agent כ-binary קרוס-פלטפורמה (pkg/nexe) כדי שמשתמשים לא-טכניים יוכלו להתקין

Phase 4 — Logs Adapter (שבועות 8–9)

קריאת קבצי session מקומיים (Claude Code, Cursor, VSCode) דרך אותו companion agent
שכבת סינון secrets לפני העלאה (regex לזיהוי API keys, tokens, סיסמאות)
Tools לניתוח: get_team_activity, search_sessions

Phase 5 — הקשחה וייצוב (שבועות 10–11)

בדיקות אבטחה (במיוחד input validation, מניעת path traversal ב-local files)
Load testing, rate limiting
תיעוד למשתמשים ולמפתחים
Multi-tenancy אם מיועד ליותר מארגון אחד