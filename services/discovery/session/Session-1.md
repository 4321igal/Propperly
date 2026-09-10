# Session 1 — Source Discovery UI

## Tasks Requested

1. Create a basic UI for the discovery service
2. Create a script that runs the project and opens the HTML in a browser
3. Create a guide on how to run the project

---

## What Was Done

### 1. Basic UI — `services/public/index.html`

A single-page HTML UI was created and served statically by the Express server.
The UI covers the full discovery flow across three steps:

**Step 1 — Workspace**
- Shows workspace ID, state, and whether an approved inventory exists.
- Provides a button to start a new discovery run.
- Accepts an optional seed path before starting.

**Step 2 — Candidates**
- Lists all discovered source candidates in a table.
- Each row has ✓ (INCLUDE) and ✗ (EXCLUDE) buttons that call the API.
- Allows manually adding a candidate by path and kind (GIT_REPO / FOLDER / UNKNOWN).
- Shows and resolves identity conflicts (SAME / DIFFERENT).

**Step 3 — Approve**
- Loads the proposed inventory (only INCLUDED sources).
- Displays ref, locator, and kind for each source.
- Sends `POST /api/discovery/inventory/confirm` to finalize.

### 2. Run Scripts Updated

The existing scripts (`run-discovery.ps1`, `run-discovery.sh`) were updated to:
- Print the UI URL on startup.
- Automatically open the browser at `http://localhost:<port>` after a 2-second delay.

**Windows (PowerShell):**
```powershell
.\run-discovery.ps1
.\run-discovery.ps1 -Port 3001 -WorkspaceCwd "C:\my\project"
```

**Mac / Linux (Bash):**
```bash
./run-discovery.sh
./run-discovery.sh 3001 /path/to/workspace
```

### 3. Static Serving Added — `services/src/index.ts`

`express.static` was added to serve `services/public/` at `/`.
The UI is now accessible at `http://localhost:3001` without any separate file server.

### 4. Running Guide — `services/discovery/RUNNING.md`

A markdown guide was created covering:
- Prerequisites
- How to start on Windows and Mac/Linux
- UI usage walkthrough (7 steps)
- Full table of API routes
- Environment variables (`PORT`, `PROPPERLY_CWD`)

---

## Files Created / Modified

| File | Action |
|------|--------|
| `services/public/index.html` | Created — single-page discovery UI |
| `services/src/index.ts` | Modified — added `express.static` for public dir |
| `run-discovery.ps1` | Modified — added browser auto-open |
| `run-discovery.sh` | Modified — added browser auto-open |
| `services/discovery/RUNNING.md` | Created — running guide |

---

---

# סשן 1 — ממשק גילוי מקורות (תרגום עברי)

## משימות שהתבקשו

1. צור UI בסיסי לשירות הדיסקברי
2. צור סקריפט שמריץ את הפרויקט ופותח את ה-HTML בדפדפן
3. צור מדריך איך להריץ את הפרויקט

---

## מה בוצע

### 1. ממשק בסיסי — `services/public/index.html`

נוצר ממשק HTML חד-עמודי המוגש סטטית על-ידי שרת ה-Express.
הממשק מכסה את זרימת הדיסקברי המלאה בשלושה שלבים:

**שלב 1 — Workspace**
- מציג מזהה workspace, מצב, והאם קיים inventory מאושר.
- כפתור להתחלת ריצת דיסקברי חדשה.
- אפשרות להזין נתיב seed לפני ההתחלה.

**שלב 2 — Candidates (מועמדים)**
- מציג את כל המועמדים שנמצאו בטבלה.
- כל שורה כוללת כפתורי ✓ (INCLUDE) ו-✗ (EXCLUDE) שקוראים ל-API.
- אפשרות להוסיף מועמד ידנית לפי נתיב וסוג (GIT_REPO / FOLDER / UNKNOWN).
- מציג ומאפשר פתרון קונפליקטי זהות (SAME / DIFFERENT).

**שלב 3 — אישור**
- טוען את ה-inventory המוצע (רק מקורות עם INCLUDED).
- מציג ref, locator וסוג לכל מקור.
- שולח `POST /api/discovery/inventory/confirm` לאישור סופי.

### 2. עדכון סקריפטי הרצה

הסקריפטים הקיימים (`run-discovery.ps1`, `run-discovery.sh`) עודכנו כך ש:
- מדפיסים את כתובת ה-UI בהפעלה.
- פותחים דפדפן אוטומטית ב-`http://localhost:<port>` לאחר 2 שניות.

**Windows (PowerShell):**
```powershell
.\run-discovery.ps1
.\run-discovery.ps1 -Port 3001 -WorkspaceCwd "C:\my\project"
```

**Mac / Linux (Bash):**
```bash
./run-discovery.sh
./run-discovery.sh 3001 /path/to/workspace
```

### 3. Serving סטטי — `services/src/index.ts`

נוסף `express.static` להגשת `services/public/` מ-`/`.
הממשק נגיש כעת ב-`http://localhost:3001` ללא שרת קבצים נפרד.

### 4. מדריך הרצה — `services/discovery/RUNNING.md`

נוצר מדריך markdown הכולל:
- דרישות מוקדמות
- איך להפעיל ב-Windows וב-Mac/Linux
- הדרכת שימוש ב-UI (7 שלבים)
- טבלת כל ה-routes של ה-API
- משתני סביבה (`PORT`, `PROPPERLY_CWD`)

---

## קבצים שנוצרו / שונו

| קובץ | פעולה |
|------|--------|
| `services/public/index.html` | נוצר — ממשק דיסקברי חד-עמודי |
| `services/src/index.ts` | שונה — נוסף `express.static` לתיקיית public |
| `run-discovery.ps1` | שונה — נוסף פתיחת דפדפן אוטומטית |
| `run-discovery.sh` | שונה — נוסף פתיחת דפדפן אוטומטית |
| `services/discovery/RUNNING.md` | נוצר — מדריך הרצה |
