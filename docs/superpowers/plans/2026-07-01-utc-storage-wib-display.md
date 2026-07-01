# UTC Storage and WIB Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist all operational timestamps as UTC instants and render every user-facing UI/PDF/XLSX timestamp in WIB (`Asia/Jakarta`).

**Architecture:** Use PostgreSQL `timestamptz` for instant columns, keep Node and DB sessions on UTC, and centralize all WIB formatting/date-window logic in one helper. Avoid a new date library; built-in `Intl.DateTimeFormat` and `Date` are enough.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, `pg`, `xlsx`, Node `assert` + `tsx`.

---

## Scope Decisions

- Store instant timestamps as UTC via PostgreSQL `TIMESTAMPTZ(3)` and runtime/session UTC.
- Treat existing `TIMESTAMP(3)` values as UTC wall-clock during migration using `USING "<column>" AT TIME ZONE 'UTC'`.
- [x] **Global Date Formatting Cleanup**: Show UI, PDF, and XLSX timestamps in WIB only at formatting/output boundaries.
- Date-only business filters such as `2026-07-01` mean `2026-07-01 00:00:00 WIB` through `2026-07-02 00:00:00 WIB`, converted to UTC for queries.
- Do not add moment/dayjs/date-fns-tz. Native `Intl` is enough.

## Files

- Create: `lib/time.ts` - single source for UTC/WIB helpers.
- Create: `lib/time.spec.ts` - small assert-based checks.
- Modify: `prisma/schema.prisma` - add `@db.Timestamptz(3)` to instant `DateTime` fields.
- Create: `prisma/migrations/<timestamp>_use_timestamptz_for_instants/migration.sql` - convert existing timestamp columns safely.
- Modify: `lib/prisma.ts` - force PostgreSQL session timezone to UTC.
- Modify: `Dockerfile` - set `TZ=UTC` for the app process.
- Modify: `render.yaml` - set `TZ=UTC` for Render deployment.
- Modify: `app/api/admin/export/route.ts` - use WIB Excel serial/date cells.
- Modify: `app/admin/export/queries.ts` - use WIB day/quarter/year windows for export filters.
- Modify: `lib/admin-activity-period.ts` - build period windows from WIB business dates.
- Modify: `lib/presence.ts` - today window is WIB, not server-local.
- Modify: `app/dashboard/activity/actions.ts` - replace local `setHours` windows with WIB helper.
- Modify: `app/dashboard/pjum/actions.ts` - PJUM period parsing uses WIB day boundaries.
- Modify: `app/reports/pjum/actions.ts` - legacy PJUM period parsing uses WIB day boundaries.
- Modify: `app/reports/actions/types.ts` - BMS report period filters use WIB windows.
- Modify targeted UI/PDF formatter files found by `rg "toLocaleDateString|Intl.DateTimeFormat|date-fns|format\\(" app lib -g "*.ts" -g "*.tsx"` where the value is user-facing.

---

### Task 1: Add Central Time Helpers

**Files:**
- Create: `lib/time.ts`
- Create: `lib/time.spec.ts`

- [ ] **Step 1: Add helper**

Create `lib/time.ts`:

```ts
export const UTC_TIME_ZONE = "UTC";
export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const JAKARTA_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});

const EXCEL_DATE_OFFSET = 25569;
const MS_PER_DAY = 86_400_000;

export function formatJakartaDateTime(value: Date | string | null | undefined) {
    if (!value) return "";
    return DATE_TIME_FORMATTER.format(new Date(value));
}

export function formatJakartaDate(value: Date | string | null | undefined) {
    if (!value) return "";
    return DATE_FORMATTER.format(new Date(value));
}

export function getJakartaDayRange(dateKey: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
    if (!match) throw new Error(`Invalid date key: ${dateKey}`);

    const [, year, month, day] = match;
    const start = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)) - 7 * 60 * 60 * 1000);
    const endExclusive = new Date(start.getTime() + MS_PER_DAY);

    return { start, endExclusive };
}

export function getJakartaDateRange(fromDate?: string, toDate?: string) {
    return {
        start: fromDate ? getJakartaDayRange(fromDate).start : undefined,
        endExclusive: toDate ? getJakartaDayRange(toDate).endExclusive : undefined,
    };
}

export function getJakartaYearWindow(year: number) {
    return {
        start: getJakartaDayRange(`${year}-01-01`).start,
        endExclusive: getJakartaDayRange(`${year + 1}-01-01`).start,
    };
}

export function getJakartaQuarterWindow(year: number, quarter: 1 | 2 | 3 | 4) {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 3;
    const endYear = endMonth > 12 ? year + 1 : year;
    const normalizedEndMonth = endMonth > 12 ? endMonth - 12 : endMonth;

    return {
        start: getJakartaDayRange(`${year}-${String(startMonth).padStart(2, "0")}-01`).start,
        endExclusive: getJakartaDayRange(`${endYear}-${String(normalizedEndMonth).padStart(2, "0")}-01`).start,
    };
}

export function getJakartaQuarterKey(value: Date | string) {
    const month = Number(getJakartaParts(new Date(value)).month);
    if (month <= 3) return "q1";
    if (month <= 6) return "q2";
    if (month <= 9) return "q3";
    return "q4";
}

export function toExcelJakartaSerial(value: Date | string | null | undefined) {
    if (!value) return null;

    const parts = getJakartaParts(new Date(value));
    const wallClockUtcMs = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
    );

    return EXCEL_DATE_OFFSET + wallClockUtcMs / MS_PER_DAY;
}

function getJakartaParts(date: Date) {
    return Object.fromEntries(
        JAKARTA_PARTS_FORMATTER.formatToParts(date)
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value]),
    ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>;
}
```

- [ ] **Step 2: Add assert checks**

Create `lib/time.spec.ts`:

```ts
import assert from "node:assert/strict";
import {
    formatJakartaDate,
    formatJakartaDateTime,
    getJakartaDayRange,
    getJakartaQuarterKey,
    getJakartaQuarterWindow,
    getJakartaYearWindow,
    toExcelJakartaSerial,
} from "./time";

const instant = new Date("2026-06-30T03:01:20.000Z");

assert.equal(formatJakartaDate(instant), "30 Jun 2026");
assert.equal(formatJakartaDateTime(instant), "30 Jun 2026, 10.01");
assert.equal(getJakartaDayRange("2026-07-01").start.toISOString(), "2026-06-30T17:00:00.000Z");
assert.equal(getJakartaDayRange("2026-07-01").endExclusive.toISOString(), "2026-07-01T17:00:00.000Z");
assert.equal(getJakartaYearWindow(2026).start.toISOString(), "2025-12-31T17:00:00.000Z");
assert.equal(getJakartaYearWindow(2026).endExclusive.toISOString(), "2026-12-31T17:00:00.000Z");
assert.equal(getJakartaQuarterWindow(2026, 2).start.toISOString(), "2026-03-31T17:00:00.000Z");
assert.equal(getJakartaQuarterWindow(2026, 2).endExclusive.toISOString(), "2026-06-30T17:00:00.000Z");
assert.equal(getJakartaQuarterKey(new Date("2026-06-30T16:59:59.000Z")), "q2");
assert.equal(getJakartaQuarterKey(new Date("2026-06-30T17:00:00.000Z")), "q3");
assert.equal(toExcelJakartaSerial(new Date("2026-06-30T17:00:00.000Z")), 46204);
```

- [ ] **Step 3: Run helper check**

Run:

```bash
npx tsx lib/time.spec.ts
```

Expected: command exits with code `0` and no output.

- [ ] **Step 4: Commit**

```bash
git add lib/time.ts lib/time.spec.ts
git commit -m "feat(time): add UTC and WIB time helpers"
```

---

### Task 2: Force UTC Storage Semantics

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_use_timestamptz_for_instants/migration.sql`
- Modify: `lib/prisma.ts`
- Modify: `Dockerfile`
- Modify: `render.yaml`

- [ ] **Step 1: Audit current production assumption before migration**

Run against the target DB:

```sql
SHOW timezone;
SELECT now()::text AS now_text, localtimestamp::text AS local_timestamp_text;
SELECT "reportNumber", "createdAt"::text, "finishedAt"::text
FROM "Report"
WHERE "createdAt" IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 10;
```

Expected before continuing: `timezone` is `GMT` or `UTC`, and sampled business timestamps are already intended as UTC raw values. If samples are known WIB wall-clock values, stop and change the migration `AT TIME ZONE 'UTC'` clauses to `AT TIME ZONE 'Asia/Jakarta'`.

- [ ] **Step 2: Update Prisma schema native types**

Add `@db.Timestamptz(3)` to every instant `DateTime` field:

```prisma
deletedAt DateTime? @db.Timestamptz(3)
createdAt DateTime @default(now()) @db.Timestamptz(3)
updatedAt DateTime @updatedAt @db.Timestamptz(3)
finishedAt DateTime? @db.Timestamptz(3)
pjumExportedAt DateTime? @db.Timestamptz(3)
lastSeen DateTime @db.Timestamptz(3)
readAt DateTime? @db.Timestamptz(3)
disabledAt DateTime? @db.Timestamptz(3)
lastUsedAt DateTime? @db.Timestamptz(3)
fromDate DateTime @db.Timestamptz(3)
toDate DateTime @db.Timestamptz(3)
approvedAt DateTime? @db.Timestamptz(3)
```

Apply this to:

- `User.deletedAt`
- `GoogleDriveFolderCache.createdAt`
- `GoogleDriveFolderCache.updatedAt`
- `Report.finishedAt`
- `Report.pjumExportedAt`
- `Report.createdAt`
- `Report.updatedAt`
- `ApprovalLog.createdAt`
- `ActivityLog.createdAt`
- `UserPresence.lastSeen`
- `Notification.readAt`
- `Notification.createdAt`
- `PushSubscription.disabledAt`
- `PushSubscription.lastUsedAt`
- `PushSubscription.createdAt`
- `PushSubscription.updatedAt`
- `PjumExport.fromDate`
- `PjumExport.toDate`
- `PjumExport.approvedAt`
- `PjumExport.createdAt`
- `PjumExport.updatedAt`
- `AppSetting.updatedAt`

- [ ] **Step 3: Create migration SQL**

Create `prisma/migrations/<timestamp>_use_timestamptz_for_instants/migration.sql`:

```sql
ALTER TABLE "User"
    ALTER COLUMN "deletedAt" TYPE TIMESTAMPTZ(3) USING "deletedAt" AT TIME ZONE 'UTC';

ALTER TABLE "GoogleDriveFolderCache"
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "Report"
    ALTER COLUMN "finishedAt" TYPE TIMESTAMPTZ(3) USING "finishedAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "pjumExportedAt" TYPE TIMESTAMPTZ(3) USING "pjumExportedAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "ApprovalLog"
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "ActivityLog"
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "UserPresence"
    ALTER COLUMN "lastSeen" TYPE TIMESTAMPTZ(3) USING "lastSeen" AT TIME ZONE 'UTC';

ALTER TABLE "Notification"
    ALTER COLUMN "readAt" TYPE TIMESTAMPTZ(3) USING "readAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "PushSubscription"
    ALTER COLUMN "disabledAt" TYPE TIMESTAMPTZ(3) USING "disabledAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "lastUsedAt" TYPE TIMESTAMPTZ(3) USING "lastUsedAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "PjumExport"
    ALTER COLUMN "fromDate" TYPE TIMESTAMPTZ(3) USING "fromDate" AT TIME ZONE 'UTC',
    ALTER COLUMN "toDate" TYPE TIMESTAMPTZ(3) USING "toDate" AT TIME ZONE 'UTC',
    ALTER COLUMN "approvedAt" TYPE TIMESTAMPTZ(3) USING "approvedAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "AppSetting"
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
```

- [ ] **Step 4: Force PostgreSQL session timezone**

In `lib/prisma.ts`, add `options` to the `new Pool` config:

```ts
const pool = new Pool({
    connectionString: cleanDatabaseUrl,
    max: poolMax,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    allowExitOnIdle: true,
    options: "-c timezone=UTC",
    ssl: { rejectUnauthorized: false },
});
```

- [ ] **Step 5: Force Node process timezone in deployment**

In `Dockerfile`, add:

```dockerfile
ENV TZ=UTC
```

In `render.yaml`, add an env var for the web service:

```yaml
- key: TZ
  value: UTC
```

- [ ] **Step 6: Generate Prisma client**

Run:

```bash
npx prisma generate
```

Expected: Prisma Client generated successfully.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/prisma.ts Dockerfile render.yaml
git commit -m "fix(db): store timestamps as UTC instants"
```

---

### Task 3: Fix XLSX Timestamp Output

**Files:**
- Modify: `app/api/admin/export/route.ts`

- [ ] **Step 1: Replace local Excel serial conversion**

Import the helper:

```ts
import { toExcelJakartaSerial } from "@/lib/time";
```

Delete `EXCEL_DATE_OFFSET`, `toExcelDate`, and the local millisecond conversion.

Update `dateCell`:

```ts
function dateCell(date: Date | null | undefined): XLSX.CellObject {
    const serial = toExcelJakartaSerial(date);
    if (serial === null) return { t: "s", v: "" };
    return { t: "n", v: serial, z: DATE_FORMAT };
}
```

- [ ] **Step 2: Run checks**

```bash
npx tsx lib/time.spec.ts
npx eslint app/api/admin/export/route.ts lib/time.ts lib/time.spec.ts
```

Expected: both commands pass.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/export/route.ts
git commit -m "fix(export): render xlsx timestamps in WIB"
```

---

### Task 4: Fix Export and Dashboard Date Filters

**Files:**
- Modify: `app/admin/export/queries.ts`
- Modify: `lib/admin-activity-period.ts`
- Modify: `lib/presence.ts`
- Modify: `app/dashboard/activity/actions.ts`
- Modify: `app/dashboard/pjum/actions.ts`
- Modify: `app/reports/pjum/actions.ts`
- Modify: `app/reports/actions/types.ts`

- [x] **Step 1: Replace export date filters**

In `app/admin/export/queries.ts`, import:

```ts
import {
    getJakartaDateRange,
    getJakartaQuarterKey,
    getJakartaQuarterWindow,
    getJakartaYearWindow,
} from "@/lib/time";
```

Replace report/PJUM `fromDate` and `toDate` filters with:

```ts
const { start, endExclusive } = getJakartaDateRange(
    filter.fromDate,
    filter.toDate,
);

if (start || endExclusive) {
    where.createdAt = {
        ...(start ? { gte: start } : {}),
        ...(endExclusive ? { lt: endExclusive } : {}),
    };
}
```

Replace preventive export windows:

```ts
function getPreventiveExportWindow(
    year: number,
    quarter: "all" | 1 | 2 | 3 | 4,
) {
    if (quarter === "all") {
        return getJakartaYearWindow(year);
    }

    return getJakartaQuarterWindow(year, quarter);
}
```

Replace quarter detection:

```ts
function getQuarterKeyFromDate(date: Date): "q1" | "q2" | "q3" | "q4" {
    return getJakartaQuarterKey(date);
}
```

- [x] **Step 2: Replace activity/presence local day windows**

Use `getJakartaDayRange(new Date().toISOString().slice(0, 10))` only if the business meaning is "today in WIB". For reusable code, add this helper to `lib/time.ts`:

```ts
export function getTodayJakartaDateKey(now = new Date()) {
    const parts = getJakartaParts(now);
    return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getTodayJakartaRange(now = new Date()) {
    return getJakartaDayRange(getTodayJakartaDateKey(now));
}
```

Then replace `setHours(0, 0, 0, 0)` windows in `lib/presence.ts` and `app/dashboard/activity/actions.ts` with:

```ts
const { start, endExclusive } = getTodayJakartaRange();
return { start, end: endExclusive };
```

- [x] **Step 3: Replace PJUM period parsing**

For `from` and `to` date strings:

```ts
const { start: fromDate, endExclusive } = getJakartaDateRange(from, to);
if (!fromDate || !endExclusive) {
    return { error: "Periode PJUM tidak valid" };
}
const toDate = new Date(endExclusive.getTime() - 1);
```

Use `fromDate` and `toDate` for stored period boundaries and query filters. Use `< endExclusive` for filtering when possible.

- [x] **Step 4: Replace report period filters**

In `app/reports/actions/types.ts`, replace `new Date(y, m, d)` month/year boundaries with `getJakartaDayRange` or `getJakartaYearWindow`.

- [x] **Step 5: Run checks**

```bash
npx tsx lib/time.spec.ts
npx eslint app/admin/export/queries.ts lib/admin-activity-period.ts lib/presence.ts app/dashboard/activity/actions.ts app/dashboard/pjum/actions.ts app/reports/pjum/actions.ts app/reports/actions/types.ts
```

Expected: commands pass.

- [x] **Step 6: Commit**

```bash
git add app/admin/export/queries.ts lib/admin-activity-period.ts lib/presence.ts app/dashboard/activity/actions.ts app/dashboard/pjum/actions.ts app/reports/pjum/actions.ts app/reports/actions/types.ts lib/time.ts lib/time.spec.ts
git commit -m "fix(time): use WIB windows for business filters"
```

---

### Task 5: Standardize User-Facing Time Formatting

**Files:**
- Modify targeted UI/PDF files only after `rg` confirms direct date rendering.

- [x] **Step 1: Find unsafe formatters**

Run:

```bash
rg -n "toLocaleDateString|toLocaleString|Intl\\.DateTimeFormat|date-fns|format\\(" app lib -g "*.ts" -g "*.tsx"
```

- [x] **Step 2: Replace user-facing date/time display with helper**

For date + time:

```ts
import { formatJakartaDateTime } from "@/lib/time";

formatJakartaDateTime(value);
```

For date-only:

```ts
import { formatJakartaDate } from "@/lib/time";

formatJakartaDate(value);
```

Do not replace:

- currency `toLocaleString("id-ID")`
- filenames that intentionally use ISO dates
- machine payloads using `.toISOString()`

- [x] **Step 3: Prioritize these files first**

Patch these first because they are high-traffic surfaces:

- `app/dashboard/reports/_components/admin-reports-table.tsx`
- `app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts`
- `app/dashboard/pjum/[id]/page.tsx`
- `app/dashboard/pjum/_components/admin-pjum-table.tsx`
- `app/dashboard/activity/_components/admin-activity-table.tsx`
- `lib/pdf/generate-pjum-pdf.ts`
- `lib/pdf/generate-pjum-package-pdf.ts`
- `lib/pdf/report-pdf-builder.ts`
- `lib/pdf/generate-revision-pdf.ts`

- [x] **Step 4: Run checks**

```bash
npx tsx lib/time.spec.ts
npx eslint app/dashboard/reports/_components/admin-reports-table.tsx app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts app/dashboard/pjum/[id]/page.tsx app/dashboard/pjum/_components/admin-pjum-table.tsx app/dashboard/activity/_components/admin-activity-table.tsx lib/pdf/generate-pjum-pdf.ts lib/pdf/generate-pjum-package-pdf.ts lib/pdf/report-pdf-builder.ts lib/pdf/generate-revision-pdf.ts
```

Expected: commands pass.

- [x] **Step 5: Commit**

```bash
git add app/dashboard lib/pdf lib/time.ts
git commit -m "fix(ui): display timestamps in WIB"
```

---

### Task 6: Verify Database and Export Behavior

**Files:**
- No code files unless a check fails.

- [ ] **Step 1: Run type/lint checks**

```bash
npx tsc --noEmit
npx eslint
```

Expected: both commands pass.

- [ ] **Step 2: Verify generated migration locally**

Run on a local/staging database first:

```bash
npx prisma migrate deploy
```

Expected: migration succeeds and timestamp columns become `timestamp with time zone`.

Verify:

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('createdAt', 'updatedAt', 'finishedAt', 'pjumExportedAt', 'approvedAt', 'readAt', 'lastSeen', 'fromDate', 'toDate', 'deletedAt')
ORDER BY table_name, column_name;
```

Expected: migrated timestamp columns show `timestamp with time zone`.

- [ ] **Step 3: Verify app session timezone**

Run a local route or script that uses `prisma.$queryRaw`:

```ts
const rows = await prisma.$queryRaw<{ timezone: string }[]>`SHOW timezone`;
console.log(rows);
```

Expected: `UTC`.

- [ ] **Step 4: Verify XLSX manually**

Export reports from `/dashboard/reports`, open the XLSX, and confirm:

- Excel cells are date cells, not text.
- Timestamp `2026-06-30T03:01:20.000Z` appears as `30/06/2026 10.01`.
- `Tanggal Dibuat`, workflow timestamp columns, `Tanggal Selesai`, and `Tanggal PJUM` are WIB.

- [ ] **Step 5: Commit verification-only changes if any**

If verification caused small fixes:

```bash
git add <changed-files>
git commit -m "fix(time): complete WIB timestamp verification"
```

If no files changed, skip commit.

---

## Self-Review

- Requirement covered: DB storage strict UTC via `TIMESTAMPTZ(3)`, Node `TZ=UTC`, and PostgreSQL session `timezone=UTC`.
- Requirement covered: UI/PDF/XLSX displays WIB via `lib/time.ts`.
- Requirement covered: date filters are interpreted as WIB business days and converted to UTC instants for querying.
- Deliberately skipped: adding a new date dependency. Native `Intl` is enough.
- Deliberately gated: production migration. Run audit and staging migration before deploying because a wrong `AT TIME ZONE` assumption can shift old data by 7 hours.
