# תוכנית בנייה — השלמת Slice 01 + שכבות הבאות

מבוסס על: `SLICE_01_DEVELOPMENT_PLAN.md` ו-`SLICE_01_IMPLEMENTATION_STRUCTURE.md`  
תאריך: 2026-09-10

---

## סקירת מצב נוכחי

| רכיב | מיקום | סטטוס |
|---|---|---|
| `domain/types.ts` | `app/src/domain/types.ts` | ✅ הושלם |
| `storage/append-store.ts` | `storage/src/append-store.ts` | ✅ הושלם |
| `data-center/*-store.ts` | `data-center/src/` | ✅ הושלם |
| `source-access/` | `services/discovery/source-access/` | ✅ הושלם (חבילה שגויה) |
| `discovery/` (policy, orchestrator, identity, projection, providers) | `services/discovery/discovery/` | ✅ הושלם |
| `approval/` (revision, confirm) | `services/discovery/approval/` | ✅ הושלם |
| REST routes | `services/discovery/routes/` | ✅ הושלם |
| `app/bootstrap/` — `propperly start` | `app/src/` | ❌ חסר |
| Web Review UI | `web/src/` | ❌ שלד בלבד |
| בדיקות קבלה A1–A14 | — | ❌ חסר |
| אירועי מדידות (Observability) | — | ❌ חסר |

---

## גרף תלויות — מה חסר

```
Phase A: app/bootstrap/
   ├── workspace-resolver.ts  ← תלוי ב: data-center/workspace-store
   ├── start.ts               ← תלוי ב: workspace-resolver + services HTTP
   ├── cli-output.ts          ← ללא תלויות
   └── index.ts               ← כניסת CLI

Phase B: העברת source-access (אופציונלי)
   └── services/discovery/source-access/ → app/src/source-access/

Phase C: web/ Review UI
   ├── pages/ReviewSources.tsx
   ├── components/CandidateList.tsx
   ├── components/CandidateRow.tsx
   ├── components/ConfirmButton.tsx
   ├── components/AddSourceForm.tsx
   ├── components/IdentityAmbiguityModal.tsx
   └── components/ResumeScreen.tsx

Phase D: בדיקות קבלה A1–A14

Phase E: שכבת MCP (לאחר השלמת Slice 01)
```

---

## Phase A — Bootstrap (R-1): `propperly start`

**חבילה:** `app/src/bootstrap/`  
**מטרה:** כניסת CLI שמכירה את מצב ה-workspace ומנתבת בהתאם.

### A.1 — `workspace-resolver.ts`

```ts
export async function resolveWorkspace(context: { cwd: string }): Promise<Workspace>
```

**אלגוריתם:**
1. חפש workspace קיים ב-`~/.propperly/workspaces/` התואם ל-`cwd` הנוכחי
2. אם נמצא — החזר עם המצב הנוכחי
3. אם לא נמצא — קרא ל-`initializeWorkspace()` → מצב=NEW
4. קרא מ-`data-center/workspace-store`

**קבצי נתונים:**
```
~/.propperly/workspaces/{workspaceId}/workspace.json
```

---

### A.2 — `start.ts`

```ts
export async function propperlyStart(context: { cwd: string }): Promise<void>
```

**טבלת ניתוב לפי מצב workspace:**

| מצב | פעולה |
|---|---|
| `NEW` | POST `/api/discovery/run` → פתח browser |
| `DISCOVERY_ACTIVE` | GET `/api/discovery/run/:id` → המשך polling |
| `DISCOVERY_INTERRUPTED` | POST resume → הצג ResumeScreen |
| `REVIEW_PENDING` | פתח browser ל-`http://localhost:3001/` |
| `INVENTORY_APPROVED` | הדפס סיכום → המשך לזרימה downstream |
| `COMMISSIONED` | הפעל התנהגות קיימת |

**כלל:** `propperly start` הוא נקודת הכניסה היחידה למוצר. גישה חוזרת לעולם לא תמחק workspace קיים.

---

### A.3 — `cli-output.ts`

```ts
export function printDiscoveryProgress(status: 'scanning' | 'done', found: number): void
export function printResumePrompt(existingCount: number): void
```

**פלט CLI צפוי:**
```
$ propperly start

ברוך הבא ל-Propperly.

מחפש פרויקטים ומקורות שעבדת איתם לאחרונה...

sessions אחרונות    [הושלם]
פרויקטים שצוינו   [הושלם]
בדיקת זמינות      [הושלם]

נמצאו 8 מקורות פוטנציאליים.
פותח את Propperly...
```

---

### A.4 — `index.ts` (כניסת CLI)

```ts
// מקרא process.argv, קורא ל-propperlyStart({ cwd: process.cwd() })
```

---

## Phase B — העברת Source-Access (אופציונלי)

**הבעיה:** `source-access/` יושב כעת ב-`services/discovery/source-access/` אבל מבחינה ארכיטקטורית שייך ל-`app/` (הוא עושה בדיקת filesystem/git מקומי, לא לוגיקת שירות).

**אפשרות A — העברה מלאה (מומלץ):**
```
services/discovery/source-access/index.ts
  → app/src/source-access/index.ts
```
לוגיקה זהה, רק מיקום שונה. מתאים לעיצוב.

**אפשרות B — השארה במקום (חוב טכני מקובל):**
לא לגעת כרגע, להמשיך לשלב הבא.

**המלצה:** לבצע העברה עכשיו — `app/src/domain/types.ts` כבר מיובא ממנה, ואין שינוי לוגיקה.

---

## Phase C — Web Review UI

**חבילה:** `web/src/`  
**מטרה:** מסך "סקירת מקורות" שבו המשתמש בוחר מה לכלול ומאשר.

### רכיבים לבנייה

```
web/src/
├── pages/
│   └── ReviewSources.tsx          ← [C.1] עמוד ראשי — מצב + polling
│
├── components/
│   ├── CandidateList.tsx          ← [C.2] מיפוי projections לשורות
│   ├── CandidateRow.tsx           ← [C.3] checkbox + אייקון זמינות + ספירת sessions
│   ├── ConfirmButton.tsx          ← [C.4] מנוטרל עד ≥1 נבחר; מציג ספירה
│   ├── AddSourceForm.tsx          ← [C.5] שדה locator + בחירת kind
│   ├── IdentityAmbiguityModal.tsx ← [C.6] דיאלוג "האם זה אותו פרויקט?"
│   └── ResumeScreen.tsx           ← [C.7] מוצג כשמצב=DISCOVERY_INTERRUPTED
```

### C.1 — `ReviewSources.tsx`

**הגיון:**
1. בטעינה — GET `/api/discovery/workspace` לקריאת מצב
2. אם `DISCOVERY_ACTIVE` — polling כל 2 שניות על `/api/discovery/run/:id`
3. כשהריצה `COMPLETED` / `PARTIAL` — GET `/api/discovery/run/:id/candidates`
4. הצג `CandidateList` + `ConfirmButton`

### C.3 — `CandidateRow.tsx`

מיפוי ארבעה ממדים לממשק:

| ממד | הצגה |
|---|---|
| `availability=INACCESSIBLE` | אייקון אזהרה, שורה מאופרת |
| `selection=INCLUDED` | checkbox מסומן |
| `selection=EXCLUDED` | checkbox ריק, טקסט "הוסר בעבר" |
| `identity=AMBIGUOUS` | כפתור "?" → פותח IdentityAmbiguityModal |

### C.4 — `ConfirmButton.tsx`

```tsx
// מנוטרל עד שיש לפחות מקור אחד INCLUDED
// תווית: "המשך עם {n} מקורות →"
// בלחיצה: POST /api/discovery/run/:id/confirm
```

### C.7 — `ResumeScreen.tsx`

```
גילוי מקורות קודם הופסק באמצע.
נמצאו 17 מקורות עד כה.

[המשך גילוי]   [סקור 17 מקורות]   [התחל מחדש]
```

"התחל מחדש" הוא בחירת משתמש מפורשת בלבד — לעולם לא אוטומטי.

### ממשק API שה-UI קורא (כבר קיים ב-`services/discovery/routes/`):

| נקודת קצה | שימוש |
|---|---|
| `GET /api/discovery/workspace` | מצב workspace |
| `POST /api/discovery/run` | התחל/המשך ריצה |
| `GET /api/discovery/run/:id` | poll סטטוס |
| `GET /api/discovery/run/:id/candidates` | רשימת מועמדים |
| `POST /api/discovery/run/:id/selection` | include/exclude |
| `POST /api/discovery/run/:id/confirm` | אישור סופי |

---

## Phase D — בדיקות קבלה

14 תרחישי קבלה (A1–A14) כבדיקות אינטגרציה שפוגעות בשרת האמיתי + קבצי `~/.propperly/` אמיתיים (ללא mocks).

**עדיפות גבוהה — לבנות ראשון:**

| ID | תרחיש | מה בוחן |
|---|---|---|
| A1 | workspace חדש → 8 מועמדים → אישור → בדיוק המקורות שנבחרו נוצרו | זרימה מלאה end-to-end |
| A9 | גילוי הופסק → מועמדים שמורים שורדים → resume עובד | עמידות בפני קריסה |
| A10 | אישור נשלח שוב עם אותו requestId → inventory זהה, ללא כפל | אידמפוטנטיות |
| A14 | עדות מועמד השתנתה אחרי סקירה → אישור עם revision ישנה נדחה | הגנת CAS |

**בדיקות נוספות:**

| ID | תרחיש |
|---|---|
| A2 | אין sessions → אפס מועמדים → הוספה ידנית עובדת |
| A3 | ספק אחד לא זמין → ספקים אחרים ממשיכים → ריצה=PARTIAL |
| A4 | אותו repo ב-20 sessions → projection אחד עם כל ה-provenance |
| A5 | אותו remote בlocator שונה → AMBIGUOUS, לא מיזוג אוטומטי |
| A6 | תיקייה הועברה → AMBIGUOUS → אדם מכריע |
| A7 | משתמש מוציא מועמד → לא נוצר Source |
| A8 | הוספה ידנית כפולה למועמד שנמצא → נתיב זהות מונע כפל |
| A11 | שני אישורים בו-זמנית → אחד מצליח, השני מקבל StaleInventoryError |
| A12 | סביבה מבודדת (air-gapped) → Slice כולו עובד ללא רשת חיצונית |
| A13 | פריסה מאוחסנת → אין corpus מקורות שעוזב את סביבת הלקוח |

---

## Phase E — שכבת MCP (לאחר Slice 01)

חבילת `mcp/` כבר קיימת. **נדחה עד שמצב `INVENTORY_APPROVED` ניתן להשגה.**

**חיבור עתידי:**
- שרת MCP קורא מה-`SourceInventory` המאושר
- בונה tool calls: `list_files`, `read_file`, `search_repo` מעל המקורות שאושרו
- Auth middleware: OAuth token → מיפוי למשתמש
- Audit log: כל tool call → data-center

---

## סדר בנייה מומלץ

```
שלב 1  → Phase A: workspace-resolver.ts           (תלוי: data-center)
שלב 2  → Phase A: cli-output.ts                   (ללא תלויות)
שלב 3  → Phase A: start.ts                        (תלוי: שלבים 1–2 + services HTTP)
שלב 4  → Phase A: index.ts (כניסת CLI)            (תלוי: שלב 3)
שלב 5  → Phase B: העברת source-access (אופציונלי) (refactor, ללא לוגיקה חדשה)
שלב 6  → Phase C: ReviewSources.tsx               (תלוי: phases A, routes קיימות)
שלב 7  → Phase C: CandidateList + CandidateRow    (תלוי: שלב 6)
שלב 8  → Phase C: ConfirmButton + AddSourceForm    (תלוי: שלב 6)
שלב 9  → Phase C: IdentityAmbiguityModal          (תלוי: שלב 7)
שלב 10 → Phase C: ResumeScreen                    (תלוי: שלב 6)
שלב 11 → Phase D: בדיקות A1, A9, A10, A14        (תלוי: הכל)
שלב 12 → Phase D: בדיקות A2–A8, A11–A13          (תלוי: שלב 11)
שלב 13 → Phase E: MCP layer                       (לאחר INVENTORY_APPROVED עובד)
```

---

## הגדרת "Done" ל-Slice 01

- [ ] `propperly start` מנתב נכון לכל חמישה מצבי workspace
- [ ] מחזור חיים DiscoveryRun: NEW → RUNNING → COMPLETED / PARTIAL / INTERRUPTED / FAILED
- [ ] כל 14 תרחישי הקבלה (A1–A14) עוברים כבדיקות אוטומטיות
- [ ] Candidate projection תמיד ניתן לבנייה מחדש מהעדויות (ללא קובץ projection-state)
- [ ] אישור אידמפוטנטי לפי requestId (A10)
- [ ] גרסת inventory ישנה ו-review revision ישנה — שניהם נדחים (A14)
- [ ] אין corpus מקורות שנבלע או מועבר במהלך הגילוי
- [ ] פריסה on-prem (A12) עובדת ללא רשת חיצונית
- [ ] אירועי מדידות (observability) נפלטים בכל מעברי מפתח
- [ ] כל גבולות הסמכות R-1/R-2/R-3/R-4 מוחזקים

---

## הערות ארכיטקטורה — מה לא לבנות עכשיו

אלה נדחו במפורש ואין לממש:

- ספקי session נוספים מעבר ל-filesystem provider הנוכחי
- מיגרציה מ-NDJSON לבסיס נתונים
- מנגנון CAS אמיתי לתהליכים מרובים (file lock מספיק לשלב זה)
- שירותי ענן / תשתית vendor
- מתאמי מקורות מרוחקים (Google Drive, GitHub API, וכו')
- עיצוב UX סופי
- שילוב ACL ארגוני + מודל auth/actor לפרודקשן
