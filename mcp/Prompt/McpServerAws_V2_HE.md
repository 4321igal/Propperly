# Propperly

Propperly הוא שרת MCP (Model Context Protocol) ארגוני שמעניק לסוכני AI — Claude, Cursor, VS Code ואחרים — גישה מאומתת ומבוקרת למקורות ידע של הצוות: Google Drive, GitHub, קבצים מקומיים ויומני סשן AI.

## ארכיטקטורה

```
סוכן AI (Claude Desktop / Claude Code / Cursor)
       │
       │  MCP  (JSON-RPC דרך HTTP או stdio)
       ▼
┌─────────────────────────────────────────────────────┐
│  שרת MCP  (mcp/mcpserveraws/)                       │
│  כלים: Drive · Git · Local · Sessions · Ping        │
│  אימות: JWT Bearer middleware                       │
└──────────────────────────┬──────────────────────────┘
                           │  REST פנימי  (x-internal-key)
                           ▼
┌─────────────────────────────────────────────────────┐
│  Services  (services/src/index.ts)  פורט 3001       │
│  ├── /oauth/google/*   — זרימת OAuth ל-Google Drive │
│  ├── /oauth/github/*   — זרימת OAuth ל-GitHub       │
│  ├── /api/drive/*      — קבצי Google Drive          │
│  ├── /api/git/*        — repos, קוד, PRs ב-GitHub  │
│  ├── /api/local/*      — קבצים שסונכרנו ע"י Companion │
│  ├── /api/sessions/*   — יומני סשן AI               │
│  ├── /api/discovery/*  — מלאי מקורות (SL-02)        │
│  └── /health           — בדיקת זמינות               │
│                                                     │
│  אחסון: PostgreSQL (Prisma) + דיסק מקומי ./uploads  │
└──────────────────────────┬──────────────────────────┘
                           │  העלאות
                           ▼
┌─────────────────────────────────────────────────────┐
│  Companion Agent  (services/companion/)              │
│  רץ על מחשב המשתמש.                                 │
│  • צופה בתיקיות מקומיות ברשימת היתר (chokidar)      │
│  • סורק תיקיות סשן AI (~/.claude/projects/ וכו')    │
│  • מנקה סודות לפני העלאה                            │
│  • שולח POST ל-/api/local/files ול-/api/sessions    │
└─────────────────────────────────────────────────────┘
```

## כלי MCP

| כלי | מתאם | תיאור |
|---|---|---|
| `list_drive_files` | Drive | רשימת קבצים/תיקיות ב-Google Drive |
| `read_drive_file` | Drive | קריאת קובץ Drive לפי מזהה |
| `search_drive` | Drive | חיפוש טקסט חופשי ב-Drive |
| `list_repos` | Git | רשימת repos ב-GitHub (לפי משתמש או ארגון) |
| `search_code` | Git | חיפוש קוד ב-GitHub |
| `get_pr_diff` | Git | diff מאוחד של pull request |
| `get_commit_history` | Git | היסטוריית commits לסניף |
| `list_local_files` | Local | רשימת קבצים שסונכרנו ע"י Companion |
| `read_local_file` | Local | קריאת קובץ מסונכרן לפי מזהה |
| `search_local_files` | Local | חיפוש בקבצים מסונכרנים לפי שם/נתיב |
| `search_sessions` | Sessions | חיפוש ביומני סשן AI |
| `get_recent_activity` | Sessions | סיכום פעילות AI אחרונה |
| `services_ping` | Core | בדיקת זמינות שכבת Services |

## זרימת אימות

לכל מתאם יש זרימת OAuth נפרדת. המשתמש מאמת פעם אחת ומקבל JWT:

```
1. פתח דפדפן ← GET /oauth/google/authorize   (או /oauth/github/authorize)
2. אשר הרשאות ← Services מחליף code ← מנפיק JWT
3. הוסף את ה-JWT לקונפיגורציית לקוח ה-AI:
   "headers": { "Authorization": "Bearer <token>" }
4. שרת MCP מאמת JWT בכל בקשה, ומגביל נתונים למשתמש הספציפי
```

## הפעלה מקומית

**דרישות מוקדמות:** Node 20+, PostgreSQL 15+.

### 1. Services

```bash
cd services
cp .env.example .env   # מלא DB_URL, OAuth credentials, JWT_SECRET
npx prisma db push
npm start              # מאזין על :3001
```

### 2. שרת MCP

```bash
cd mcp/mcpserveraws
npm install
# מצב HTTP (למשתמשים מרובים / Claude Desktop)
$env:MCP_MODE="http"; $env:SERVICES_URL="http://localhost:3001"; npm start
# מצב stdio (לפיתוח מקומי / Claude Code)
npm run dev
```

### 3. Companion Agent

```bash
cd services/companion
npm install
npm run setup          # אינטראקטיבי: URL שרת, bearer token, תיקיות לצפייה
npm start              # מסנכרן סשנים, לאחר מכן עוקב אחרי שינויים
```

## אבטחה

- **אימות תעבורה:** JWT Bearer על כל נקודות קצה HTTP של MCP; `x-internal-key` לקריאות פנימיות בין Services.
- **סינון סודות:** Companion מסיר מפתחות AWS, טוקני GitHub, מפתחות OpenAI ו-Anthropic, JWTs וסודות מסומנים לפני העלאת כל קובץ.
- **הגנה מפני path traversal:** `services/security/path-guard.ts` מאמת את כל נתיבי הקבצים לפני אחסון או שליפה.
- **הגבלת קצב:** `express-rate-limit` מופעל גלובלית, עם הגבלות מחמירות יותר על נקודות קצה OAuth והעלאה.
- **אימות קלט:** העלאות מוגבלות ל-10 MB; תוכן בינארי (null bytes) נדחה; תוכן סשן מוגבל ל-50 KB.
- **יומן ביקורת:** כל קריאה לכלי MCP נכתבת לטבלה `ToolCall` (userId, tool, args, תקציר תוצאה, משך).

## ערימת טכנולוגיות

| שכבה | טכנולוגיה |
|---|---|
| פרוטוקול MCP | `@modelcontextprotocol/sdk` (TypeScript) |
| מסגרת HTTP | Express 4 |
| אימות | `jose` (JWT), Google OAuth 2.0, GitHub OAuth |
| GitHub API | `@octokit/rest` |
| Google Drive | `googleapis` |
| מסד נתונים | PostgreSQL + Prisma |
| מעקב אחרי קבצים | chokidar 3 |
| סביבת ריצה | Node 20, TypeScript 5, tsx |

## מבנה הפרויקט

```
mcp/
  mcpserveraws/          # שרת MCP — כל מתאמי הכלים
    src/
      index.ts           # כניסה HTTP + stdio
      services-client.ts # לקוח מוקלד לממשק ה-REST של Services
      auth/middleware.ts # JWT Bearer + fallback מפתח API
      tools/
        drive.ts         # כלי Google Drive
        git.ts           # כלי GitHub
        local.ts         # כלי קבצים מסונכרנים
        sessions.ts      # כלי יומני סשן AI
        services.ts      # services_ping

services/
  src/index.ts           # כניסה לאפליקציית Express — מחבר את כל הנתיבים
  drive/                 # Google Drive OAuth + לקוח API + נתיבים
  git/                   # GitHub OAuth + Octokit client + נתיבים
  local/                 # נתיבי העלאה/קריאת companion + Prisma + אחסון דיסק
  sessions/              # נתיבי העלאה/חיפוש סשנים + Prisma
  discovery/             # SL-02 מלאי מקורות (workspace, runs, approval)
  auth/jwt.ts            # פונקציית הנפקת JWT
  audit/index.ts         # מתעד קריאות לכלי MCP
  db/client.ts           # singleton של Prisma
  security/
    path-guard.ts        # אימות path traversal + storage-key
    rate-limit.ts        # presets של express-rate-limit
  public/index.html      # ממשק Source Discovery בדפדפן
  companion/             # סוכן Companion עצמאי
    src/
      index.ts           # כניסה: אשף --setup או לולאת ריצה
      config.ts          # ~/.propperly/companion.json
      upload.ts          # לקוח HTTP → Services
      secrets.ts         # סינון סודות ב-regex
      local-sync.ts      # מעקב תיקיות עם chokidar
      session-sync.ts    # גילוי וסנכרון קבצי סשן AI
```
