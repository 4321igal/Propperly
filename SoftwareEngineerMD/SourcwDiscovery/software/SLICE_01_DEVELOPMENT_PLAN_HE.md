# SLICE 01 — גילוי מקורות: תוכנית פיתוח מלאה

מבוסס על: `SLICE_01_SOURCE_DISCOVERY_SYSTEM_V1.md`  
בסיס הקוד הנוכחי: כל החבילות (app, services, engine, data-center, storage, web) הן שלדים ריקים בלבד.  
מטרה: מימוש ארבע האחריויות הייצורה — R-1 מעטפת אפליקציה מקומית, R-2 גישה למקורות, R-3 גילוי מקורות + מועמדים, R-4 סמכות אישור — בתוספת ממשק ביקורת Web.

---

## מיפוי ארכיטקטורה: עיצוב מערכת → חבילות ה-Monorepo

| אחריות במערכת | חבילת Monorepo | הערות |
|---|---|---|
| R-1 מעטפת אפליקציה מקומית | `app` | Bootstrap, כניסה מודעת-מצב, ניתוב Orchestration |
| R-2 גישה למקורות | `app/src/source-access/` | מתאמי Git + תיקייה מאחורי חוזה אחד |
| R-3 גילוי מקורות + מועמדים | `services` | מחזור חיים של DiscoveryRun, ספקי session, זהות, עדויות |
| R-4 סמכות אישור | `services` | אישור, אידמפוטנטיות, גרסת inventory |
| שמירה | `storage` + `data-center` | עדויות עמידות, מצב ריצה, inventory |
| ממשק ביקורת | `web` | מסך Review Sources, פעולות משתמש |
| Engine / ליבה סמנטית | `engine` | **אין תפקיד ב-Slice 01** |

---

## סקירת סדר הבנייה

```
שלב 0: טיפוסים משותפים וחוזות
שלב 1: שכבת שמירה (storage + data-center)
שלב 2: R-2 מתאמי גישה למקורות
שלב 3: R-3 גילוי מקורות + מועמדים
שלב 4: R-1 Bootstrap וניתוב (propperly start)
שלב 5: R-4 סמכות אישור
שלב 6: ממשק ביקורת Web
שלב 7: אינטגרציה, בדיקות קבלה, מדידות
```

כל שלב מייצר קוד עובד ובדיק לפני שהשלב הבא מתחיל.

---

## שלב 0 — טיפוסים משותפים וחוזות

**מטרה:** הגדרת טיפוסי הדומיין הליבתיים וממשקים לוגיים במקום אחד, כך שכל החבילות צורכות את אותו אוצר מילים.

### 0.1 יצירת `domain/types.ts`

הגדרת טיפוסי TypeScript עבור:

```ts
// --- Workspace ---
type WorkspaceId = string;
type WorkspaceState =
  | 'NEW'
  | 'DISCOVERY_ACTIVE'
  | 'DISCOVERY_INTERRUPTED'
  | 'REVIEW_PENDING'
  | 'INVENTORY_APPROVED'
  | 'COMMISSIONED';

interface Workspace {
  id: WorkspaceId;
  state: WorkspaceState;
  createdAt: string; // ISO
}

// --- DiscoveryRun ---
type RunId = string;
type RunStatus = 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'INTERRUPTED' | 'FAILED' | 'CANCELLED';

interface DiscoveryRun {
  id: RunId;
  workspaceId: WorkspaceId;
  status: RunStatus;
  policySnapshot: DiscoveryPolicy;
  startedAt: string;
  endedAt?: string;
}

// --- DiscoveryPolicy ---
interface DiscoveryPolicy {
  providers: string[];         // מזהי ספקים מורשים
  sessionWindowDays: number;   // חלון זמן מוגבל
  maxCandidates: number;
}

// --- SourceCandidate (ארבעה ממדים) ---
type Availability  = 'AVAILABLE' | 'INACCESSIBLE' | 'UNKNOWN';
type Support       = 'SUPPORTED' | 'UNSUPPORTED' | 'UNKNOWN';
type Identity      = 'RESOLVED' | 'AMBIGUOUS' | 'UNRESOLVED';
type Selection     = 'UNDECIDED' | 'INCLUDED' | 'EXCLUDED';

interface CandidateRef { runId: RunId; candidateId: string; }

interface SourceCandidateProjection {
  ref: CandidateRef;
  locator: string;
  kind: 'GIT_REPO' | 'FOLDER' | 'UNKNOWN';
  displayName: string;
  availability: Availability;
  support: Support;
  identity: Identity;
  selection: Selection;
  sessionCount: number;
  provenance: string[];        // מזהי ספקים שתרמו
}

// --- עדות זהות ---
type IdentityRelation = 'SAME_LOCATOR' | 'AMBIGUOUS' | 'DIFFERENT';

interface IdentityEvidence {
  candidateId: string;
  relation: IdentityRelation;
  basis: string;               // הסבר קריא לאדם
}

// --- Source (לאחר אישור) ---
type SourceId = string;

interface Source {
  id: SourceId;
  workspaceId: WorkspaceId;
  locator: string;
  kind: string;
  approvedAt: string;
}

// --- SourceInventory ---
interface SourceInventory {
  workspaceId: WorkspaceId;
  version: number;
  head: string;                // hash תוכן אטום של הסט המאושר
  sources: Source[];
  confirmedAt: string;
}

// --- ממשקים לוגיים (סעיף 8 במסמך המערכת) ---

interface BootstrapApi {
  resolveWorkspace(context: { cwd: string }): Promise<Workspace>;
  startOrResumeSourceDiscovery(workspaceId: WorkspaceId, policyRequest?: Partial<DiscoveryPolicy>, expectedState?: WorkspaceState): Promise<DiscoveryRun>;
  getDiscoveryStatus(runId: RunId): Promise<DiscoveryRun>;
  reviewSourceCandidates(workspaceId: WorkspaceId, runId: RunId): Promise<SourceCandidateProjection[]>;
  recordCandidateSelection(ref: CandidateRef, decision: 'INCLUDE' | 'EXCLUDE' | 'RESET', requestId: string): Promise<void>;
  addSourceCandidate(locator: string, declaredKind: string | undefined, requestId: string): Promise<SourceCandidateProjection>;
  confirmSourceInventory(workspaceId: WorkspaceId, includedRefs: CandidateRef[], expectedInventoryVersion: number, expectedReviewRevision: string, requestId: string): Promise<SourceInventory>;
}

interface SourceAccessApi {
  inspectSourceCandidate(input: { kind: string; locator: string }): Promise<InspectionResult>;
  identifyLocalRepository(locator: string): Promise<RepoIdentity>;
  identifyLocalFolder(locator: string): Promise<FolderIdentity>;
}
```

**תוצר:** קובץ `domain/types.ts` אחד שמיובא על-ידי כל החבילות. אין מימוש — טיפוסים בלבד.

---

## שלב 1 — שכבת שמירה

**חבילות:** `storage`, `data-center`  
**מטרה:** מימוש מאגר append-only עמיד ובטוח-לחזרות לכל עובדות Slice 01.

### 1.1 Storage: מאגר append-only ברמה נמוכה

קובץ: `storage/src/append-store.ts`

```ts
// הוספת רשומת JSON לקובץ (NDJSON)
appendRecord(filePath: string, record: object): Promise<void>

// קריאת כל הרשומות מקובץ
readRecords<T>(filePath: string): Promise<T[]>

// כתיבה אטומית לקבצים בעלי מסמך יחיד (workspace state, inventory)
atomicWrite(filePath: string, data: object): Promise<void>

// קריאת קובץ מסמך יחיד
readDocument<T>(filePath: string): Promise<T | null>
```

מימוש: NDJSON ליומני אירועים; JSON לקבצים עם מסמך יחיד. שימוש ב-`fs.rename` לכתיבה אטומית (כתיבה לקובץ זמני, ואז rename).

### 1.2 Data Center: פעולות שמירה דומייניות

קובץ: `data-center/src/workspace-store.ts`
```ts
persistWorkspace(workspace: Workspace): Promise<void>
readWorkspace(id: WorkspaceId): Promise<Workspace | null>
updateWorkspaceState(id: WorkspaceId, state: WorkspaceState): Promise<void>
```

קובץ: `data-center/src/discovery-store.ts`
```ts
persistDiscoveryRun(run: DiscoveryRun): Promise<void>
updateRunStatus(runId: RunId, status: RunStatus, endedAt?: string): Promise<void>
readDiscoveryRun(runId: RunId): Promise<DiscoveryRun | null>
readActiveRunForWorkspace(workspaceId: WorkspaceId): Promise<DiscoveryRun | null>
```

קובץ: `data-center/src/candidate-store.ts`
```ts
// Append-only — אף פעם לא דורס עדות קיימת
appendCandidateEvidence(runId: RunId, evidence: CandidateEvidenceRecord): Promise<void>
readCandidateEvidence(runId: RunId): Promise<CandidateEvidenceRecord[]>

appendSelectionDecision(runId: RunId, decision: SelectionDecisionRecord): Promise<void>
readSelectionDecisions(runId: RunId): Promise<SelectionDecisionRecord[]>
```

קובץ: `data-center/src/inventory-store.ts`
```ts
appendConfirmationReceipt(receipt: ConfirmationReceipt): Promise<void>
readConfirmationByRequestId(requestId: string): Promise<ConfirmationReceipt | null>
persistApprovedInventory(inventory: SourceInventory): Promise<void>
readApprovedInventory(workspaceId: WorkspaceId): Promise<SourceInventory | null>
```

**מבנה קבצים** (מבוסס-קבצים לעת עתה; נתיבים פיזיים הם פרט מימוש, לא חוזה):
```
~/.propperly/
  workspaces/
    {workspaceId}/
      workspace.json                   ← כתיבה אטומית, מסמך יחיד
      discovery-runs/
        {runId}/
          run.json                     ← כתיבה אטומית, מסמך יחיד
          candidate-evidence.ndjson    ← append-only
          selection-decisions.ndjson   ← append-only
      inventory/
        confirmed.json                 ← אטומי, עם גרסאות
        confirmation-log.ndjson        ← append-only קבלות
```

**אינווריאנטים מרכזיים:**
- קבצי עדות הם append-only; אין מוטציה על רשומות קודמות.
- `atomicWrite` משתמש בקובץ זמני + rename — עמיד לקריסות.
- `readConfirmationByRequestId` מאפשר אידמפוטנטיות בשלב 5.

---

## שלב 2 — R-2 גישה למקורות

**חבילה:** `app/src/source-access/`  
**מטרה:** בדיקת מטאדאטה מוגבלת של מקורות מאחורי חוזה אחד מיוצא; מכניקת המקורות נשארת מתחת לתפר.

### 2.1 מתאם מאגר Git

קובץ: `app/src/source-access/repo-adapter.ts`

```ts
export async function identifyLocalRepository(locator: string): Promise<RepoIdentity & InspectionResult>
```

מימוש:
1. בדיקה שהנתיב קיים (`fs.stat`)
2. בדיקה שתיקיית `.git` קיימת
3. הרצת `git remote -v` (מוגבל; לכידת שגיאות)
4. חילוץ URL מרוחק אם קיים
5. החזרת `availability`, `support=SUPPORTED`, `externalIdentity` מהמרוחק
6. לעולם לא קורא תוכן קבצים, לעולם לא מעלה corpus

מקרי הוכחה (מ-Spike 01):
- מאגר Git תקין עם מרוחק → AVAILABLE, SUPPORTED, זהות מרוחקת
- מאגר ללא מרוחק → AVAILABLE, SUPPORTED, אין זהות חיצונית
- נתיב לא קיים → INACCESSIBLE
- תיקייה שאינה Git → חוסר-תאימות סוג מוצג במפורש, לא מוסתר

### 2.2 מתאם תיקייה

קובץ: `app/src/source-access/folder-adapter.ts`

```ts
export async function identifyLocalFolder(locator: string): Promise<FolderIdentity & InspectionResult>
```

מימוש:
1. בדיקה שהנתיב קיים
2. בדיקה שהוא תיקייה (לא קובץ)
3. בדיקת הרשאת קריאה (ניסיון `fs.readdir` עם הגבלה ל-1)
4. לעולם לא קורא תוכן קבצים
5. אין הפעלת מכניקת Git (תיקייה היא תיקייה גם אם מכילה `.git`)

מקרי הוכחה (מ-Spike 02):
- תיקייה תקינה → AVAILABLE, SUPPORTED
- נתיב חסר → INACCESSIBLE
- קובץ ולא תיקייה → INACCESSIBLE + הערת סוג מפורשת
- הרשאה נדחתה → INACCESSIBLE
- מאגר Git המטופל כתיקייה → AVAILABLE, SUPPORTED (אין מכניקת Git)

### 2.3 Dispatch גישה למקורות (חוזה אפליקציה → גישה למקורות)

קובץ: `app/src/source-access/index.ts`

```ts
export async function inspectSourceCandidate(input: { kind: string; locator: string }): Promise<InspectionResult>
```

מימוש (מ-Spike 03 — router מפורש עם טיפוסים, ללא registry/DI):
```ts
switch (normalizeKind(input.kind)) {
  case 'GIT_REPO': return repoAdapter.identifyLocalRepository(input.locator);
  case 'FOLDER':   return folderAdapter.identifyLocalFolder(input.locator);
  default:         throw new KindNotSupportedError(input.kind);
}
```

כלל: סוגים לא ידועים נכשלים במפורש. אין הסקת סוג היוריסטית. מכניקת מקורות לעולם לא דולפת מעל התפר.

---

## שלב 3 — R-3 גילוי מקורות + מועמדים

**חבילה:** `services/src/discovery/`  
**מטרה:** מחזור חיים של DiscoveryRun, מניית ספקי session, צבירת עדויות מועמדים, הקרנה ארבע-ממדית, זהות שמרנית.

### 3.1 מדיניות גילוי

קובץ: `services/src/discovery/policy.ts`

```ts
export function computeEffectivePolicy(
  adminPolicy: DiscoveryPolicy,
  userRequest?: Partial<DiscoveryPolicy>
): DiscoveryPolicy
```

כללים:
- המשתמש יכול רק לצמצם, לעולם לא להרחיב מעבר למדיניות מנהל.
- מדיניות מנהל היא הגבול העליון על ספקים וחלון session.
- מדיניות ברירת מחדל של מנהל: כל הספקים המקומיים הנתמכים, חלון 30 יום (ערך ברירת מחדל מדויק = כוונון מוצר; נדחה).

### 3.2 ספקי Session

קובץ: `services/src/discovery/providers/local-provider.ts`

ממשק שכל הספקים מממשים:
```ts
interface SessionProvider {
  id: string;
  discover(policy: DiscoveryPolicy): AsyncIterable<DiscoveredReference>;
}

interface DiscoveredReference {
  locator: string;
  inferredKind: 'GIT_REPO' | 'FOLDER' | 'UNKNOWN';
  sessionCount: number;
  providerSessionIds: string[];
}
```

ספק ראשון נתמך (הוכח ב-Spike 04):
- קורא מטאדאטה session מוגבל ומורשה בלבד
- לעולם לא קורא גופי session/הודעות (עיבוד סמנטי אסור)
- מדלג על sessions מחוץ לחלון המדיניות
- פולט רק `DiscoveredReference`; עדות חסרה מניבה `kind=UNKNOWN`, לא ערך המצאה

### 3.3 Orchestration של DiscoveryRun

קובץ: `services/src/discovery/run-orchestrator.ts`

```ts
export async function startDiscoveryRun(workspaceId: WorkspaceId, policy: DiscoveryPolicy): Promise<DiscoveryRun>
export async function resumeDiscoveryRun(runId: RunId): Promise<DiscoveryRun>
export async function executeDiscovery(run: DiscoveryRun): Promise<void>
```

אלגוריתם `executeDiscovery` (מ-Spike 06):
```
לכל ספק ב-policy.providers:
  נסה:
    לכל reference שהספק מגלה:
      אם כבר נראה (אותו locator בריצה זו):
        appendCandidateEvidence(mergeProvenance) — אידמפוטנטי, שמור provenance
        המשך
      inspection = inspectSourceCandidate(reference)
      evidence = buildCandidateEvidence(reference, inspection)
      appendCandidateEvidence(run.id, evidence)   ← שמירה מצטברת D7
  תפוס providerError:
    רשום שגיאת ספק; המשך עם ספקים נותרים (ריצה חלקית בסדר)

אם כל הספקים נכשלו: markRunStatus(FAILED)
אחרת אם ספק כלשהו נכשל: markRunStatus(PARTIAL)
אחרת: markRunStatus(COMPLETED)
```

לוגיקת המשך (D10, Spike 06):
1. קריאת מועמדים שנשמרו לריצה שנקטעה
2. מנייה מחדש של ספקים; דילוג על locators שנשמרו (אידמפוטנטיות יחידת-עבודה)
3. לעולם לא יצירה שקטה של DiscoveryRun כפול

### 3.4 פתרון זהות שמרנית

קובץ: `services/src/discovery/identity.ts`

```ts
export function resolveIdentityRelation(a: CandidateEvidenceRecord, b: CandidateEvidenceRecord): IdentityRelation
```

עץ החלטות (מ-Spike 05, D8):
```
1. התאמת locator מנורמלת מדויקת → SAME_LOCATOR (קיבוץ תצפיות)
2. זהות חיצונית חזקה סותרת (בעלים/שם מרוחק שונה) → DIFFERENT
3. אותם בעלים+שם מרוחק ב-locators שונים → AMBIGUOUS (אל תסיק MOVED)
4. דמיון היוריסטי (basename דומה, נתיב נראה כהועבר) → AMBIGUOUS
5. עדות חסרה/לא מספקת → AMBIGUOUS
```

לעולם לא: auto-merge מטושטש, הסקת MOVED אוטומטית, path-as-identity.

### 3.5 עדות מועמד והקרנה ארבע-ממדית

קובץ: `services/src/discovery/candidate-projection.ts`

```ts
export function projectCandidate(
  evidence: CandidateEvidenceRecord[],
  decisions: SelectionDecisionRecord[]
): SourceCandidateProjection
```

ארבעה folds עצמאיים (מ-Spike 07, D12):
- **availability** = עדות הזמינות האחרונה (עובדה תפעולית)
- **support** = עדות התמיכה האחרונה (עובדה יכולת טכנית)
- **identity** = נפתר דרך עדות זהות + פתרון אנושי (D8)
- **selection** = החלטת INCLUDE/EXCLUDE/RESET האחרונה (סמכות אנושית)

אינווריאנטים מרכזיים:
- ההקרנה תמיד ניתנת לבנייה מחדש מעדויות append-only — אין צורך בקובץ מצב הקרנה (הוכח ב-Spike 07).
- רשומות עדות קודמות לעולם לא מתמוטטות.
- שינויי selection דורסים בחירה קודמת; שינויי עדות אינם משפיעים על החלטות אנושיות קודמות.

---

## שלב 4 — R-1 Bootstrap וניתוב (`propperly start`)

**חבילה:** `app/src/bootstrap/`  
**מטרה:** כניסת מוצר מודעת-מצב; ניתוב לשלב הנכון לפי מצב workspace.

### 4.1 פתרון Workspace

קובץ: `app/src/bootstrap/workspace-resolver.ts`

```ts
export async function resolveWorkspace(context: { cwd: string }): Promise<Workspace>
```

אלגוריתם:
1. טעינת קונפיגורציית פריסה + זהות הרצה
2. חיפוש workspace קיים ל-`cwd` / הקשר משתמש זה
3. אם אין: `initializeWorkspace()` → state=NEW
4. אם קיים: החזרת workspace קיים עם מצב נוכחי

`initializeWorkspace` קובע state=NEW אך לא מרמז על commissioning (D10).

### 4.2 Dispatch מודע-מצב (סעיף 9 במסמך המערכת)

קובץ: `app/src/bootstrap/start.ts`

```ts
export async function propperlyStart(context: { cwd: string }): Promise<void>
```

טבלת ניתוב:
```ts
switch (workspace.state) {
  case 'NEW':
  case 'DISCOVERY_ACTIVE':
  case 'DISCOVERY_INTERRUPTED':
    await startOrResumeDiscovery(workspace);
    break;
  case 'REVIEW_PENDING':
    await openWebReview(workspace);
    break;
  case 'INVENTORY_APPROVED':
  case 'COMMISSIONED':
    await continueDownstreamFlow(workspace);  // התנהגות קיימת, לא מוחלפת
    break;
}
```

כללים:
- `propperly start` הוא נקודת הכניסה היחידה למוצר (D19).
- הפעלה מחדש לעולם לא יוצרת workspace מחדש באופן הרסני (D10).
- גילוי שנקטע מוסיף לפעולה מחדש, לא מתחיל בשקט מחדש.
- ריצה פעילה בעת הפעלה חוזרת: החזרת/פתרון ריצה קיימת; אין ריצה כפולה שקטה (סעיף 11).

### 4.3 פלט CLI (סקיצה מסעיף 15.1)

קובץ: `app/src/bootstrap/cli-output.ts`

```
$ propperly start

ברוכים הבאים ל-Propperly.

מוצא פרויקטים ומקורות שעבדת איתם לאחרונה...

Sessions אחרונים [סיים]
פרויקטים מוזכרים [סיים]
נגישות [סיים]

נמצאו 8 מקורות פוטנציאליים.
פותח את Propperly...
```

---

## שלב 5 — R-4 סמכות אישור

**חבילה:** `services/src/approval/`  
**מטרה:** אישור מפורש המעביר ממצב טרום-אישור ל-Source Inventory מאושר; אידמפוטנטיות; מקביליות אופטימיסטית.

### 5.1 חישוב גרסת ביקורת

קובץ: `services/src/approval/review-revision.ts`

```ts
export function computeReviewRevision(projections: SourceCandidateProjection[]): string
```

מימוש: hash דטרמיניסטי יציב של סט הקרנות המועמדים (ממוין לפי candidateId). גרסה זו קושרת את האישור למצב שהמשתמש ביקר בפועל — אם מועמד כלשהו משתנה לאחר הביקורת, הגרסה משתנה והאישור נדחה (D14, A14).

### 5.2 אישור Source Inventory

קובץ: `services/src/approval/approval-authority.ts`

```ts
export async function confirmSourceInventory(
  workspaceId: WorkspaceId,
  includedRefs: CandidateRef[],
  expectedInventoryVersion: number,
  expectedReviewRevision: string,
  requestId: string
): Promise<SourceInventory>
```

אלגוריתם (מ-Spike 08):
```
1. בדוק יומן אישורים ל-requestId זה → אם נמצא, החזר תוצאה שהתחייבה (אידמפוטנטיות, D13, A10)
2. קרא head inventory נוכחי → דחה אם version != expectedInventoryVersion (D14)
3. חשב גרסת ביקורת נוכחית מהקרנות חיות → דחה אם != expectedReviewRevision (D14, A14)
4. לכל includedRef:
     פתור הקרנת מועמד שלו
     צור Source { id: newSourceId(), locator, kind, approvedAt }
5. הרכב SourceInventory { version: current+1, head: newHash(sources), sources }
6. atomicWrite inventory  ← פעולה אטומית סידורית אחת (D13, D18)
7. appendConfirmationReceipt { requestId, reviewRevision, inventoryVersion, actor, timestamp }
8. updateWorkspaceState(INVENTORY_APPROVED)
9. החזר inventory
```

אינווריאנטים:
- אותו `requestId` תמיד מחזיר את אותו inventory שהתחייב (אידמפוטנטי).
- גרסת inventory ישנה → `StaleInventoryError` (המבקש מרענן).
- גרסת ביקורת ישנה → `StaleReviewError` (המבקש מרענן מועמדים ואז מאשר מחדש).
- אין Source שנוצר ממצב INCLUDED בלבד — רק מקריאת `confirmSourceInventory` מפורשת (D3, D5).
- אין עיבוד סמנטי כתוצר לוואי (D15).

הערה: אי-הכללה הדדית אמיתית למספר תהליכים (CAS אטומי ללקוחות מקבילים) נדחית לעיצוב מימוש (נספח C, A11).

---

## שלב 6 — ממשק ביקורת Web

**חבילה:** `web/src/`  
**מטרה:** מסך Review Sources; פעולות משתמש (include/exclude/add/resolve/confirm).

### 6.1 Routes API שנחשפים על-ידי APP ל-WEB

עדכון `app/CONTRACT.md` ו-`app/src/contract.ts`:

```ts
interface AppApi {
  // גילוי
  getDiscoveryStatus(runId: string): Promise<DiscoveryRun>;
  
  // מועמדים
  listCandidates(workspaceId: string, runId: string): Promise<SourceCandidateProjection[]>;
  includeCandidates(refs: CandidateRef[], requestId: string): Promise<void>;
  excludeCandidate(ref: CandidateRef, requestId: string): Promise<void>;
  addManualCandidate(locator: string, declaredKind?: string, requestId: string): Promise<SourceCandidateProjection>;
  
  // בירור עמימות זהות
  resolveIdentityAmbiguity(ref: CandidateRef, resolution: 'SAME' | 'DIFFERENT', requestId: string): Promise<void>;
  
  // אישור
  confirmInventory(workspaceId: string, includedRefs: CandidateRef[], expectedInventoryVersion: number, expectedReviewRevision: string, requestId: string): Promise<SourceInventory>;
}
```

### 6.2 מסך Review Sources (סקיצה מסעיף 15.2)

```
+------------------------------------------------------+
| מצאנו 8 מקורות שעבדת איתם לאחרונה                  |
+------------------------------------------------------+
| [v] propperly          Git repo   18 sessions אחרונים|
| [v] analytics-dbt      Git repo    7 sessions אחרונים|
| [ ] old-propperly      Git repo   הוחרג בעבר        |
| [!] finance-models     Folder     גישה לא זמינה     |
+------------------------------------------------------+
| + הוסף מקור                    המשך עם 6 →          |
+------------------------------------------------------+
```

רכיבים:
- `CandidateList` — מרנדר את כל הקרנות המועמדים; ממפה ארבעה ממדים למצב UI
- `CandidateRow` — checkbox (selection), אייקון סטטוס (availability), מידע (sessions, kind)
- `IdentityAmbiguityModal` — דיאלוג "האם זה אותו פרויקט?" (סעיף 15.3)
- `AddSourceForm` — קלט locator + בורר סוג
- `ConfirmButton` — מושבת עד שיש לפחות 1 כלול; תווית מציגה ספירה

מצב:
- Polling או SSE לסטטוס DiscoveryRun (RUNNING → COMPLETED/PARTIAL)
- UI אופטימיסטי ל-include/exclude
- שגיאות conflict (inventory ישן או גרסת ביקורת ישנה) → הצגת הנחיית רענון

### 6.3 מסך המשך (סקיצה מסעיף 15.4)

מוצג כאשר workspace state = DISCOVERY_INTERRUPTED:
```
גילוי מקורות קודם נקטע.
17 מקורות כבר נמצאו.

[המשך גילוי]  [בקר ב-17 מקורות]  [התחל מחדש]
```

"התחל מחדש" הוא בחירה מפורשת של המשתמש בלבד — לעולם לא אוטומטית (D10).

---

## שלב 7 — אינטגרציה, בדיקות ומדידות

### 7.1 בדיקות תרחיש קבלה

מימוש כבדיקות אינטגרציה המכסות את כל 14 התרחישים מסעיף 17:

| מזהה | תרחיש בדיקה |
|---|---|
| A1 | Workspace חדש → 8 מועמדים תקינים → אישור → Sources שנבחרו בדיוק נוצרים |
| A2 | לא נמצאו sessions → אפס מועמדים → הוספה ידנית עדיין עובדת |
| A3 | ספק אחד לא זמין → ספקים אחרים ממשיכים → run=PARTIAL |
| A4 | אותו מאגר ב-20 sessions → הקרנת מועמד אחת עם כל provenance |
| A5 | אותו מרוחק ב-locator שונה → AMBIGUOUS, לא auto-merged |
| A6 | תיקייה הועברה → AMBIGUOUS → אדם פותר |
| A7 | משתמש מחריג מועמד → אין Source שנוצר |
| A8 | הוספה ידנית מכפילה מועמד שהתגלה → נתיב זהות מונע כפיל |
| A9 | גילוי נקטע → מועמדים שנשמרו שורדים → המשך עובד |
| A10 | אישור נסה שוב פעמיים עם אותו requestId → אותו inventory, אין מעבר כפול |
| A11 | שני לקוחות מאשרים במקביל → אחד מתחייב, השני מקבל StaleInventoryError |
| A12 | On-prem ללא חיבור לאינטרנט → Slice מלא מסתיים ללא קריאת רשת חיצונית |
| A13 | פריסה מאוחסנת → אין corpus מקור שעוזב הסביבה המקומית |
| A14 | עדות מועמד משתנה לאחר ביקורת → אישור עם גרסה ישנה נדחה |

### 7.2 בדיקות חוזה / יחידה

לכל יכולת:
- `inspectSourceCandidate` — כל מקרי הוכחה מ-Spike 01/02/03
- `identityRelation` — כל מקרי הוכחה מ-Spike 05
- `projectCandidate` — כל מקרי הוכחה מ-Spike 07 (replay דטרמיניסטי, עצמאות ממדים)
- `confirmSourceInventory` — כל מקרי הוכחה מ-Spike 08 (אידמפוטנטיות, גרסה ישנה, גרסת ביקורת ישנה, התאוששות מקריסה)
- `computeEffectivePolicy` — משתמש לא יכול להרחיב מעבר למדיניות מנהל

### 7.3 אירועי מדידה מובנים (סעיף 14)

כל אירוע מובנה כולל:

| שדה | טיפוס | הערות |
|---|---|---|
| `run_id` | string | זהות קורלציה יציבה |
| `workspace_id` | string | תמיד בהיקף workspace |
| `provider` | string | איזה ספק session |
| `event_type` | string | לדוגמה: `discovery.run.started`, `candidate.persisted`, `inventory.confirmed` |
| `timestamp` | ISO string | |
| `error_code` | string? | טקסונומיית שגיאות קריאה-למכונה |

ללא telemetry ספציפי לספק. אירועים חייבים להיות ניתנים לחיבור למדידה מקומית או ארגונית.

סט אירועים מינימלי:
- `discovery.run.started` / `completed` / `partial` / `interrupted` / `failed`
- `provider.started` / `completed` / `failed` (עם ספירת מועמדים)
- `candidate.persisted` (עם ממדי availability, support, identity)
- `candidate.deduped` (provenance מוזג)
- `identity.ambiguous` (הועלה לביקורת אנושית)
- `selection.recorded` (include/exclude/reset)
- `inventory.confirm.requested` / `committed` / `replayed` / `rejected` (ישן)
- `resume.reason` (מדוע ריצה הוסיפה לפעולה לעומת התחלה מחדש)

---

## מודל הרשאות

מימוש אכיפה ב-Orchestrator (R-1) לפני dispatch יכולת:

| הרשאה | נבדק לפני |
|---|---|
| `DISCOVER_SOURCES` | `startOrResumeSourceDiscovery` |
| `VIEW_DISCOVERED_SOURCES` | `reviewSourceCandidates`, `listCandidates` |
| `MANAGE_SOURCE_INVENTORY` | `recordCandidateSelection`, `addSourceCandidate`, `confirmSourceInventory` |

אילוצי אבטחה:
- סודות לא יופיעו במטאדאטת מועמדים, יומני עדויות, או קבלות אישור.
- יומני גילוי לא יכללו תוכן גולמי של מקורות.
- מטאדאטת workspace/source מבודדת לכל workspace.
- מצב מאוחסן: אין corpus מקור שעוזב סביבת הלקוח במהלך Slice 01.

---

## נדחה — לא חלק מבנייה זו

אלה נדחים במפורש לפי סעיף 19 ונספח C. אין לממש:

- ספקי session נוספים מעבר לספק המקומי המוכח הראשון
- בחירת transport פיזי REST/gRPC/IPC
- מיגרציית טכנולוגיית database/storage (קבצי NDJSON הם נקודת ההתחלה המוכחת)
- מנגנון CAS/אי-הכללה אטומית אמיתית למספר תהליכים (נעילות קבצים מקובלות לבנייה ראשונית)
- שירותי ספק ענן / תשתית
- מתאמי מקורות מרוחקים/API (Google Docs, GitHub API, וכו')
- מקרי קצה זהות לא מוכחים: שקילות symlink, נרמול רישיות, סמנטיקת שינוי שם/fork/mirror
- עיצוב UX ויזואלי סופי
- אינטגרציה ארגונית ACL ומודל auth/actor ייצורי
- טופולוגיית מכולות ומכניקת מתקין

---

## סיכום סדר הבנייה (ממוין לפי תלויות)

```
צעד 1  → שלב 0: domain/types.ts                    (אין תלויות)
צעד 2  → שלב 1: storage append-store               (אין תלויות)
צעד 3  → שלב 1: data-center domain stores          (תלוי: storage)
צעד 4  → שלב 2: מתאמי Source Access               (תלוי: types)
צעד 5  → שלב 2: Source Access dispatch             (תלוי: adapters)
צעד 6  → שלב 3: Discovery Policy                   (תלוי: types)
צעד 7  → שלב 3: Session Provider(s)                (תלוי: policy)
צעד 8  → שלב 3: DiscoveryRun Orchestration         (תלוי: providers, data-center, source-access)
צעד 9  → שלב 3: Identity Resolution                (תלוי: types)
צעד 10 → שלב 3: Candidate Projection               (תלוי: evidence store, identity)
צעד 11 → שלב 4: Workspace Resolution               (תלוי: data-center)
צעד 12 → שלב 4: propperly start dispatch           (תלוי: workspace-resolver, run-orchestrator)
צעד 13 → שלב 5: חישוב Review Revision              (תלוי: candidate-projection)
צעד 14 → שלב 5: confirmSourceInventory             (תלוי: review-revision, inventory-store)
צעד 15 → שלב 6: APP API routes                     (תלוי: כל האמור לעיל)
צעד 16 → שלב 6: Web Review UI                      (תלוי: APP API)
צעד 17 → שלב 7: בדיקות קבלה + חוזה               (תלוי: הכל)
צעד 18 → שלב 7: אירועי מדידה                       (משולב לאורך צעדים 1–16)
```

---

## הגדרת "סיים" ל-Slice 01

- [ ] `propperly start` מנתב נכון לחמישה מצבי workspace (סעיף 9)
- [ ] מחזור חיים DiscoveryRun: NEW → RUNNING → COMPLETED / PARTIAL / INTERRUPTED / FAILED
- [ ] כל 14 תרחישי הקבלה (A1–A14) עוברים כבדיקות אוטומטיות
- [ ] הקרנת מועמד תמיד ניתנת לבנייה מחדש מעדויות (אין קובץ מצב הקרנה)
- [ ] האישור אידמפוטנטי לפי requestId (A10)
- [ ] גרסת inventory ישנה וגרסת ביקורת ישנה שתיהן נדחות (A14)
- [ ] אין corpus מקור שנעבד או מועבר במהלך גילוי
- [ ] פריסת on-prem (A12) עובדת ללא רשת חיצונית
- [ ] פריסה מאוחסנת (A13) מעבירה רק מטאדאטה מוגבלת
- [ ] אירועי מדידה מובנים נפלטים לכל המעברים המרכזיים
- [ ] כל גבולות הסמכות R-1/R-2/R-3/R-4 מתקיימים (מכניקת מקורות לא מעל התפר, אישור רק ב-R-4)
- [ ] ל-Engine/Semantic Core אין כל מעורבות ב-Slice 01
