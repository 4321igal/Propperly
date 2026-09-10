# Propperly

Propperly הוא שרת MCP (Model Context Protocol) ארגוני שנותן לסוכני AI — Claude, Cursor, VS Code ואחרים — גישה מאומתת ומבוקרת למקורות הידע של הצוות: Google Drive, GitHub, קבצים מקומיים ולוגי sessions של AI.

## ארכיטקטורה

```
סוכן AI (Claude Desktop / Claude Code / Cursor)
       │
       │  MCP  (JSON-RPC over HTTP or stdio)
       ▼
┌─────────────────────────────────────────────────────┐
│  שרת MCP  (mcp/mcpserveraws/)                       │
│  כלים: Drive · Git · Local · Sessions · Ping        │
│  אימות: JWT Bearer middleware                       │
└──────────────────────────┬──────────────────────────┘
                           │  Internal REST  (x-internal-key)
                           ▼
┌─────────────────────────────────────────────────────┐
│  Services  (services/src/index.ts)  port 3001       │
│  ├── /oauth/google/*   — OAuth flow ל-Google Drive  │
│  ├── /oauth/github/*   — OAuth flow ל-GitHub        │
│  ├── /api/drive/*      — קבצי Google Drive          │
│  ├── /api/git/*        — repos, קוד, PRs ב-GitHub  │
│  ├── /api/local/*      — קבצים מסונכרנים            │
│  ├── /api/sessions/*   — לוגי sessions של AI        │
│  ├── /api/discovery/*  — מלאי מקורות (SL-02)        │
│  └── /health           — בדיקת חיות                │
│                                                     │
│  אחסון: PostgreSQL (Prisma) + ./uploads מקומי       │
│  אחסון Discovery: קבצי JSON (data-center/)          │
└──────────────────────────┬──────────────────────────┘
                           │  uploads
                           ▼
┌─────────────────────────────────────────────────────┐
│  Companion Agent  (services/companion/)             │
│  רץ על המחשב של המשתמש.                            │
│  • עוקב אחרי תיקיות מורשות (chokidar)              │
│  • סורק תיקיות sessions של AI (~/.claude/projects/) │
│  • מנקה secrets לפני העלאה                         │
│  • שולח POST ל-/api/local/files ו-/api/sessions     │
└─────────────────────────────────────────────────────┘
```

## כלי MCP

| כלי | מתאם | תיאור |
|---|---|---|
| `list_drive_files` | Drive | רשימת קבצים/תיקיות ב-Google Drive |
| `read_drive_file` | Drive | קריאת קובץ Drive לפי ID |
| `search_drive` | Drive | חיפוש טקסט חופשי ב-Drive |
| `list_repos` | Git | רשימת repos ב-GitHub (לפי משתמש או org) |
| `search_code` | Git | חיפוש קוד ב-GitHub |
| `get_pr_diff` | Git | diff מאוחד של pull request |
| `get_commit_history` | Git | היסטוריית commits לענף |
| `list_local_files` | Local | רשימת קבצים מסונכרנים ע"י companion |
| `read_local_file` | Local | קריאת קובץ מסונכרן לפי ID |
| `search_local_files` | Local | חיפוש קבצים מסונכרנים לפי שם/נתיב |
| `search_sessions` | Sessions | חיפוש בלוגי sessions של AI |
| `get_recent_activity` | Sessions | סיכום שימוש אחרון בכלי AI |
| `services_ping` | Core | בדיקת תקינות שכבת Services |

## תהליך אימות

לכל מתאם יש OAuth flow משלו. המשתמש מאמת פעם אחת ומקבל JWT:

```
1. פתח דפדפן → GET /oauth/google/authorize   (או /oauth/github/authorize)
2. אשר הרשאות → Services מחליף קוד → מנפיק JWT
3. הוסף JWT להגדרות לקוח AI:
   "headers": { "Authorization": "Bearer <token>" }
4. שרת MCP מאמת JWT בכל בקשה, מגביל נתונים למשתמש הספציפי
```

## הרצה מקומית

**דרישות מקדימות:** Node 20+, PostgreSQL 15+ (נדרש למתאמי local/sessions/drive/git).

> **הערה:** שירות Discovery (`/api/discovery/*`) משתמש באחסון קבצים ורץ **ללא PostgreSQL**.
> הרץ `.\run-discovery.ps1` כדי להפעיל רק את ממשק Discovery ללא הגדרת DB.

### 1. Services

```bash
cd services
cp .env.example .env   # מלא DB_URL, OAuth credentials, JWT_SECRET
npx prisma generate    # יצירת Prisma client (חובה לפני הרצה ראשונה)
npx prisma db push     # החלת schema על ה-DB
npm start              # מאזין על :3001
```

### 2. שרת MCP

```bash
cd mcp/mcpserveraws
npm install
# מצב HTTP (למשתמשים מרובים / Claude Desktop)
$env:MCP_MODE="http"; $env:SERVICES_URL="http://localhost:3001"; npm start
# מצב Stdio (לפיתוח מקומי / Claude Code)
npm run dev
```

### 3. Companion Agent

```bash
cd services/companion
npm install
npm run setup          # אינטראקטיבי: URL שרת, bearer token, תיקיות לעקוב
npm start              # מסנכרן sessions, ואז עוקב אחרי שינויים
```

### 4. Discovery בלבד (ללא DB)

```powershell
.\run-discovery.ps1                              # Windows — פותח דפדפן אוטומטית
.\run-discovery.ps1 -Port 3001 -WorkspaceCwd "C:\my\project"
```

```bash
./run-discovery.sh                               # Mac / Linux
./run-discovery.sh 3001 /path/to/workspace
```

## תוצאות בדיקה מקצה לקצה (אומתו 2026-09-10)

כל הבדיקות בוצעו מול `http://localhost:3001` עם `npx tsx services/src/index.ts`.

### Discovery flow (ללא DB)

| # | בקשה | צפוי | תוצאה |
|---|---|---|---|
| 1 | `GET /health` | `{"status":"ok"}` | ✅ |
| 2 | `GET /api/discovery/workspace` | `{"state":"NEW"}` | ✅ |
| 3 | `POST /api/discovery/runs` | `{"run_id":"…"}` + סריקת filesystem | ✅ |
| 4 | `GET /api/discovery/runs/:id` | Run + מועמדים (נמצא `C:\programming\Propperly` כ-`GIT_REPO`) | ✅ |
| 5 | `POST /api/discovery/runs/:id/selections` | `204 No Content` | ✅ |
| 6 | `GET /api/discovery/runs/:id/proposed-inventory` | refs שנכללו | ✅ |
| 7 | `POST /api/discovery/inventory/confirm` | קבלה + `inventoryVersion:1` | ✅ |
| 8 | `GET /api/discovery/workspace` | `{"state":"INVENTORY_APPROVED"}` | ✅ |

### נתיבים מוגנים ב-Auth (ללא OAuth מוגדר)

| נתיב | צפוי | תוצאה |
|---|---|---|
| `GET /api/drive/files` | `401 unauthorized` | ✅ |
| `GET /api/git/repos` | `401 unauthorized` | ✅ |
| `GET /api/local/files` | `401 unauthorized` | ✅ |
| `GET /api/sessions/search` | `401 unauthorized` | ✅ |

### שרת MCP (מצב stdio)

| קריאה | צפוי | תוצאה |
|---|---|---|
| `initialize` | לחיצת יד, `protocolVersion: 2024-11-05` | ✅ |
| `tools/list` | 13 כלים רשומים | ✅ |
| `tools/call services_ping` | מפנה ל-`/health`, מחזיר `{"status":"ok"}` | ✅ |

## עיון ב-API — נתיבי Discovery

| Method | נתיב | גוף / הערות |
|---|---|---|
| `GET` | `/api/discovery/workspace` | — |
| `POST` | `/api/discovery/runs` | `{}` |
| `GET` | `/api/discovery/runs/:id` | — |
| `POST` | `/api/discovery/runs/:id/selections` | `{ candidate_ref, selection: "INCLUDED"\|"EXCLUDED" }` |
| `POST` | `/api/discovery/runs/:id/candidates` | `{ path }` |
| `POST` | `/api/discovery/runs/:id/identity` | `{ refs: string[], relation: "SAME"\|"DIFFERENT" }` |
| `GET` | `/api/discovery/runs/:id/proposed-inventory` | — |
| `POST` | `/api/discovery/inventory/confirm` | `{ run_id, refs, request_id, expected_inventory_version, expected_review_revision }` |

## אבטחה

- **אימות תעבורה:** JWT Bearer על כל endpoints של MCP HTTP; `x-internal-key` לקריאות פנימיות של Services.
- **ניקוי secrets:** Companion מוחק מפתחות AWS, GitHub tokens, OpenAI keys, Anthropic keys, JWTs וסודות מתויגים לפני העלאת כל קובץ.
- **הגנת path traversal:** `services/security/path-guard.ts` מאמת את כל נתיבי הקבצים לפני אחסון או שליפה.
- **הגבלת קצב:** `express-rate-limit` מוחל גלובלית, עם הגבלות קשיחות יותר על endpoints של OAuth ו-upload.
- **אימות קלט:** כל uploads מוגבלים ל-10 MB; תוכן בינארי (null bytes) נדחה; תוכן session מוגבל ל-50 KB.
- **יומן audit:** כל קריאת כלי MCP נרשמת בטבלת `ToolCall` (userId, tool, args, סיכום תוצאה, משך).

## Stack טכנולוגי

| שכבה | טכנולוגיה |
|---|---|
| פרוטוקול MCP | `@modelcontextprotocol/sdk` (TypeScript) |
| מסגרת HTTP | Express 4 |
| אימות | `jose` (JWT), Google OAuth 2.0, GitHub OAuth |
| GitHub API | `@octokit/rest` |
| Google Drive | `googleapis` |
| בסיס נתונים | PostgreSQL + Prisma (מתאמי local/sessions/drive/git) |
| אחסון Discovery | קבצי JSON (data-center/) |
| עקיבת קבצים | chokidar 3 |
| Runtime | Node 20, TypeScript 5, tsx |

## מבנה הפרויקט

```
mcp/
  mcpserveraws/          # שרת MCP — כל מתאמי הכלים
    src/
      index.ts           # נקודת כניסה HTTP + stdio
      services-client.ts # לקוח מוקלד ל-Services REST API
      auth/middleware.ts # JWT Bearer + API-key fallback
      tools/
        drive.ts         # כלי Google Drive
        git.ts           # כלי GitHub
        local.ts         # כלי קבצים מסונכרנים
        sessions.ts      # כלי לוגי AI sessions
        services.ts      # services_ping

services/
  src/index.ts           # אפליקציית Express — מחבר את כל ה-routes
  drive/                 # Google Drive OAuth + API client + routes
  git/                   # GitHub OAuth + Octokit client + routes
  local/                 # routes upload/read + Prisma ops + אחסון דיסק
  sessions/              # routes upload/search + Prisma ops
  discovery/             # SL-02 מלאי מקורות (workspace, runs, approval)
  auth/jwt.ts            # עוזר הנפקת JWT
  audit/index.ts         # logger לוגי audit של קריאות כלים
  db/client.ts           # Prisma singleton
  security/
    path-guard.ts        # אימות path traversal + storage-key
    rate-limit.ts        # presets של express-rate-limit
  public/index.html      # ממשק דפדפן Source Discovery
  companion/             # companion agent עצמאי
    src/
      index.ts           # כניסה: אשף --setup או לולאת הרצה
      config.ts          # ~/.propperly/companion.json
      upload.ts          # לקוח HTTP → Services
      secrets.ts         # ניקוי secrets בregex
      local-sync.ts      # עוקב תיקיות chokidar
      session-sync.ts    # גילוי + העלאת קבצי AI sessions

data-center/src/         # אחסון קבצי Discovery (ללא DB)
  workspace-store.ts
  inventory-store.ts
  discovery-store.ts
  candidate-store.ts

run-discovery.ps1        # Windows: הפעל discovery + פתח דפדפן
run-discovery.sh         # Mac/Linux: הפעל discovery + פתח דפדפן
```
