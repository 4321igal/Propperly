# SLICE 01 — מבנה מימוש: קבצים, שירותים, סדר ושכבות

מבוסס על: `SLICE_01_DEVELOPMENT_PLAN.md`  
מטרת מסמך זה: לספק מפה מפורטת של **איפה כל קובץ יושב**, **באיזה סדר בונים**, **מה התלויות בין השירותים**, ו**מה רץ לוקאלית לעומת בענן**.

---

## 1. סדר ארגוני של הפיתוח

הפיתוח מחולק ל-8 שלבים. כל שלב חייב להסתיים ולהיות בדיק לפני שהבא מתחיל.

```
שלב 0  ── טיפוסים משותפים
   │
שלב 1  ── שכבת שמירה
   │
שלב 2  ── מתאמי גישה למקורות (Source Access)
   │
שלב 3  ── גילוי מקורות + מועמדים
   │
שלב 4  ── Bootstrap + propperly start
   │
שלב 5  ── סמכות אישור (Approval Authority)
   │
שלב 6  ── ממשק ביקורת Web
   │
שלב 7  ── אינטגרציה, בדיקות, מדידות
```

### סדר 18 הצעדים הקונקרטיים (ממוין לפי תלויות)

| צעד | שלב | מה בונים | תלוי ב |
|---|---|---|---|
| 1 | 0 | `domain/types.ts` | — |
| 2 | 1 | `storage/append-store.ts` | — |
| 3 | 1 | `data-center/*-store.ts` | צעד 2 |
| 4 | 2 | `source-access/repo-adapter.ts` | צעד 1 |
| 5 | 2 | `source-access/folder-adapter.ts` | צעד 1 |
| 6 | 2 | `source-access/index.ts` (dispatch) | צעדים 4, 5 |
| 7 | 3 | `discovery/policy.ts` | צעד 1 |
| 8 | 3 | `discovery/providers/local-provider.ts` | צעד 7 |
| 9 | 3 | `discovery/identity.ts` | צעד 1 |
| 10 | 3 | `discovery/candidate-projection.ts` | צעדים 3, 9 |
| 11 | 3 | `discovery/run-orchestrator.ts` | צעדים 3, 6, 8, 10 |
| 12 | 4 | `bootstrap/workspace-resolver.ts` | צעד 3 |
| 13 | 4 | `bootstrap/start.ts` | צעדים 11, 12 |
| 14 | 5 | `approval/review-revision.ts` | צעד 10 |
| 15 | 5 | `approval/approval-authority.ts` | צעדים 3, 14 |
| 16 | 6 | `app/contract.ts` — הרחבת API | צעד 15 |
| 17 | 6 | `web/src/` — ממשק ביקורת | צעד 16 |
| 18 | 7 | בדיקות קבלה + מדידות | הכל |

---

## 2. רשימת קבצים מלאה עם מיקומים

### חבילה: `app`
```
app/
├── src/
│   ├── domain/
│   │   └── types.ts                      ← [צעד 1] כל טיפוסי הדומיין המשותפים
│   │
│   ├── source-access/                    ← R-2: גישה למקורות
│   │   ├── index.ts                      ← [צעד 6] dispatch: kind → adapter
│   │   ├── repo-adapter.ts               ← [צעד 4] זיהוי מאגר Git מקומי
│   │   └── folder-adapter.ts             ← [צעד 5] זיהוי תיקייה מקומית
│   │
│   ├── bootstrap/                        ← R-1: מעטפת אפליקציה
│   │   ├── workspace-resolver.ts         ← [צעד 12] פתרון workspace נוכחי
│   │   ├── start.ts                      ← [צעד 13] propperly start — dispatch מצב
│   │   └── cli-output.ts                 ← [צעד 13] פלט CLI למשתמש
│   │
│   └── contract.ts                       ← [צעד 16] API שנחשף ל-WEB (מורחב)
│
├── CONTRACT.md
└── package.json
```

### חבילה: `services`
```
services/
├── src/
│   ├── discovery/                        ← R-3: גילוי מקורות + מועמדים
│   │   ├── policy.ts                     ← [צעד 7] מדיניות גילוי אפקטיבית
│   │   ├── run-orchestrator.ts           ← [צעד 11] מחזור חיים DiscoveryRun
│   │   ├── identity.ts                   ← [צעד 9] פתרון זהות שמרנית
│   │   ├── candidate-projection.ts       ← [צעד 10] הקרנה ארבע-ממדית
│   │   └── providers/
│   │       └── local-provider.ts         ← [צעד 8] ספק session מקומי
│   │
│   ├── approval/                         ← R-4: סמכות אישור
│   │   ├── review-revision.ts            ← [צעד 14] hash גרסת ביקורת
│   │   └── approval-authority.ts         ← [צעד 15] confirmSourceInventory
│   │
│   └── index.ts
│
└── package.json
```

### חבילה: `data-center`
```
data-center/
├── src/
│   ├── workspace-store.ts                ← [צעד 3] שמירת workspace
│   ├── discovery-store.ts                ← [צעד 3] שמירת DiscoveryRun
│   ├── candidate-store.ts                ← [צעד 3] עדויות + החלטות (append-only)
│   ├── inventory-store.ts                ← [צעד 3] inventory + קבלות אישור
│   └── index.ts
│
└── package.json
```

### חבילה: `storage`
```
storage/
├── src/
│   ├── append-store.ts                   ← [צעד 2] NDJSON append + atomic write
│   └── index.ts
│
└── package.json
```

### חבילה: `web`
```
web/
├── src/
│   ├── pages/
│   │   └── ReviewSources.tsx             ← [צעד 17] מסך ביקורת ראשי
│   │
│   ├── components/
│   │   ├── CandidateList.tsx             ← [צעד 17] רשימת מועמדים
│   │   ├── CandidateRow.tsx              ← [צעד 17] שורת מועמד (4 ממדים)
│   │   ├── IdentityAmbiguityModal.tsx    ← [צעד 17] "האם זה אותו פרויקט?"
│   │   ├── AddSourceForm.tsx             ← [צעד 17] הוספת מקור ידנית
│   │   ├── ConfirmButton.tsx             ← [צעד 17] כפתור "המשך עם N מקורות"
│   │   └── ResumeScreen.tsx              ← [צעד 17] מסך המשך מגילוי שנקטע
│   │
│   └── contract.ts
│
└── package.json
```

### קבצי נתונים (runtime — לא בקוד, ב-`~/.propperly/`)
```
~/.propperly/
└── workspaces/
    └── {workspaceId}/
        ├── workspace.json                ← מצב workspace (atomic write)
        ├── discovery-runs/
        │   └── {runId}/
        │       ├── run.json              ← מצב ריצה (atomic write)
        │       ├── candidate-evidence.ndjson   ← append-only
        │       └── selection-decisions.ndjson  ← append-only
        └── inventory/
            ├── confirmed.json            ← inventory מאושר (atomic)
            └── confirmation-log.ndjson   ← יומן קבלות (append-only)
```

---

## 3. סדר לוגי בין השירותים

### גרף תלויות (מי קורא למי)

```
┌─────────┐     REST/API      ┌─────────┐
│   WEB   │ ─────────────────▶│   APP   │
└─────────┘                   └────┬────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
             ┌──────────┐  ┌──────────┐  ┌──────────────┐
             │ source-  │  │SERVICES  │  │   SERVICES   │
             │ access/  │  │discovery/│  │  approval/   │
             │(in app)  │  │          │  │              │
             └──────────┘  └────┬─────┘  └──────┬───────┘
                                │               │
                                ▼               ▼
                         ┌─────────────────────────┐
                         │      DATA-CENTER         │
                         └────────────┬────────────┘
                                      │
                                      ▼
                               ┌─────────────┐
                               │   STORAGE   │
                               └─────────────┘

ENGINE → אין תפקיד ב-Slice 01
MCP    → אין תפקיד ב-Slice 01
```

### כללי אחריות בין שירותים

| שירות | מה הוא עושה | מה הוא **לא** עושה |
|---|---|---|
| **WEB** | הצגת ממשק, לכידת פעולות משתמש | Git/filesystem, לוגיקת גילוי, אישור |
| **APP** | Bootstrap, ניתוב מצב, dispatch יכולות | מכניקת Git/filesystem, שמירה ישירה |
| **APP/source-access** | בדיקת metadata מקומי (Git, תיקייה) | אישור, גילוי, עיבוד סמנטי |
| **SERVICES/discovery** | DiscoveryRun, ספקי session, זהות, הקרנה | מכניקת Git/filesystem, אישור |
| **SERVICES/approval** | אישור, אידמפוטנטיות, inventory version | גילוי, עיבוד סמנטי |
| **DATA-CENTER** | פעולות שמירה דומייניות | לוגיקה עסקית |
| **STORAGE** | append-only files, atomic write | לוגיקה דומיינית |

### סדר קריאות בזמן ריצה (happy path)

```
1. משתמש מריץ: propperly start
2. APP/bootstrap → resolveWorkspace()
3. APP/bootstrap → startOrResumeSourceDiscovery()
4. SERVICES/discovery → computeEffectivePolicy()
5. SERVICES/discovery → provider.discover(policy)
   [לכל reference:]
6.   APP/source-access → inspectSourceCandidate()
7.   SERVICES/discovery → resolveIdentityRelation()
8.   DATA-CENTER → appendCandidateEvidence()
9. DATA-CENTER → updateRunStatus(COMPLETED)
10. APP → openWebReview() → WEB נפתח
11. WEB → APP → listCandidates()
12. SERVICES/discovery → projectCandidate() [לכל מועמד]
13. [משתמש בוחר include/exclude]
14. WEB → APP → recordCandidateSelection()
15. DATA-CENTER → appendSelectionDecision()
16. [משתמש לוחץ "המשך"]
17. WEB → APP → confirmInventory()
18. SERVICES/approval → computeReviewRevision()
19. SERVICES/approval → confirmSourceInventory()
20. DATA-CENTER → atomicWrite(confirmed.json)
21. DATA-CENTER → appendConfirmationReceipt()
22. APP → updateWorkspaceState(INVENTORY_APPROVED)
```

---

## 4. מה יושב לוקאלי ומה בענן

### מפת שכבות לפי מצב פריסה

```
╔══════════════════════════════════════════════════════════════════╗
║                    HOSTED (מאוחסן בענן)                          ║
╠══════════════════════╦═══════════════════════════════════════════╣
║  סביבת הלקוח (LOCAL) ║  Propperly-hosted (CLOUD)                 ║
╠══════════════════════╬═══════════════════════════════════════════╣
║  source-access/      ║  services/discovery/ (orchestration)      ║
║  (Git, filesystem)   ║  services/approval/                       ║
║                      ║  data-center/                             ║
║  discovery/providers ║  storage/                                 ║
║  (session metadata)  ║  web/                                     ║
║                      ║                                           ║
║  app/bootstrap (CLI) ║  [metadata בלבד עובר לענן]               ║
╚══════════════════════╩═══════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║              ON-PREM / AIR-GAPPED (הכל אצל הלקוח)              ║
╠══════════════════════════════════════════════════════════════════╣
║  source-access + discovery/providers + orchestration +          ║
║  approval + data-center + storage + web                         ║
║  [הכל רץ בסביבה מקומית — אין תקשורת עם ענן]                    ║
╚══════════════════════════════════════════════════════════════════╝
```

### טבלת מיקום הרצה לפי יכולת

מבוסס על סעיף 13.1 במסמך המערכת:

| יכולת | קובץ | לוקאלי | ענן | On-prem | מגבלת מיקום |
|---|---|---|---|---|---|
| גישה למאגר Git | `app/source-access/repo-adapter.ts` | ✅ | ❌ לא לworkstation | ✅ | Git רץ היכן שהמאגר נגיש |
| גישה לתיקייה | `app/source-access/folder-adapter.ts` | ✅ | ❌ לא לfilesystem מקומי | ✅ | filesystem-local בלבד |
| גילוי session מקומי | `services/discovery/providers/local-provider.ts` | ✅ | ❌ אין גישה לsession מקומי | ✅ | חייב לרוץ היכן שהsessions נמצאים |
| פתרון זהות | `services/discovery/identity.ts` | ✅ | ✅ | ✅ | לוגיקה טהורה, ניטרלית-טופולוגיה |
| הקרנת מועמדים | `services/discovery/candidate-projection.ts` | ✅ | ✅ | ✅ | פועל על metadata של Propperly |
| Orchestration גילוי | `services/discovery/run-orchestrator.ts` | ✅ | ✅ | ✅ | יכולת אפליקציה לוגית |
| סמכות אישור | `services/approval/approval-authority.ts` | ✅ | ✅ | ✅ | דורש גבול אטומי-סידורי אחד |
| ממשק ביקורת | `web/src/` | ✅ דרך local shell | ✅ | ✅ | לא מקבל מכניקת מקורות |
| Bootstrap CLI | `app/bootstrap/start.ts` | ✅ | — | ✅ | כניסה מקומית תמיד |

### מה עובר בין שכבות (בlhosted בלבד)

**✅ מותר לעבור מלוקאל לענן:**
- metadata מוגבל: שם מקור, locator, סוג (GIT_REPO/FOLDER)
- עדות זהות: remote URL (ללא תוכן)
- ספירות session (כמות, לא תוכן)
- סטטוס: availability, support, identity, selection

**❌ אסור לעבור מלוקאל לענן:**
- תוכן קבצים מהמאגר (corpus)
- גוף הודעות session (transcript)
- כל תוכן סמנטי של המקורות

```
לוקאל ──[metadata בלבד]──▶ ענן

✅ "שם: propperly, locator: ~/work/propperly, kind: GIT_REPO"
✅ "remote: github.com/org/propperly, sessions: 18"
❌ תוכן קבצי קוד
❌ שיחות Claude/session
```

---

## 5. מבנה ויזואלי — שכבות הארכיטקטורה

```
┌─────────────────────────────────────────────────────────────┐
│                    שכבת הצגה                                 │
│  WEB: ReviewSources, CandidateList, IdentityAmbiguityModal  │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    שכבת אפליקציה (R-1)                       │
│  APP: bootstrap/start.ts, workspace-resolver.ts             │
│       source-access/ (R-2) ← Git + Folder adapters          │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
┌──────────────▼──────────┐  ┌────────────▼───────────────────┐
│  שכבת גילוי (R-3)       │  │  שכבת אישור (R-4)              │
│  SERVICES/discovery/    │  │  SERVICES/approval/            │
│  - policy               │  │  - review-revision             │
│  - run-orchestrator     │  │  - approval-authority          │
│  - identity             │  │                                │
│  - candidate-projection │  │                                │
│  - providers/           │  │                                │
└──────────────┬──────────┘  └────────────┬───────────────────┘
               │                          │
┌──────────────▼──────────────────────────▼───────────────────┐
│                    שכבת נתונים                               │
│  DATA-CENTER: workspace-store, discovery-store,             │
│               candidate-store, inventory-store              │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    שכבת אחסון                                │
│  STORAGE: append-store (NDJSON + atomic write)              │
│           קבצים ב: ~/.propperly/workspaces/                  │
└─────────────────────────────────────────────────────────────┘

ENGINE ─── אין מעורבות ב-Slice 01
MCP    ─── אין מעורבות ב-Slice 01
```

---

## 6. סיכום: מה לבנות ראשון

בהתבסס על כל האמור, סדר העדיפויות לפיתוח:

1. **`domain/types.ts`** — הכל תלוי בזה; לא מתחילים בלעדיו
2. **`storage/append-store.ts`** — תשתית, ללא תלויות
3. **`data-center/*`** — שמירה דומיינית; מאפשרת לכל שכבה לעבוד
4. **`source-access/`** — יכולת R-2; מוכחת ב-Spikes 01–03
5. **`discovery/`** — לב הפונקציונליות; Spikes 04–07
6. **`bootstrap/`** — כניסת המוצר; `propperly start`
7. **`approval/`** — גמר הזרימה; Spike 08
8. **`web/`** — ממשק משתמש; תלוי בכל מה שלפניו
9. **בדיקות** — A1–A14 לאורך כל הדרך
