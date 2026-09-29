# DB Connection Pool Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate production database connection pool exhaustion ("timeout exceeded when trying to connect") by reducing total DB queries per request through caching and query consolidation.

**Architecture:** Three-pronged approach: (A) React `cache()` to deduplicate per-request auth lookups, (B) Next.js `unstable_cache` for data that rarely changes (settings, branch hierarchy), (C) consolidate multiple `count()` calls into single `groupBy` queries. All changes are backward-compatible — no schema changes, no new dependencies.

**Tech Stack:** Next.js 16.2 / React 19.2 / Prisma 7.9 / PostgreSQL

## Global Constraints

- No new npm dependencies
- All caching must be safe to serve stale data (settings change infrequently)
- `unstable_cache` TTLs: 5 minutes for settings, 10 minutes for branch hierarchy
- Existing function signatures (return types) must remain identical — downstream callers must not break
- Use `revalidateTag()` when admin updates a cached setting to ensure instant freshness
- Every task must pass `npm run build` before committing

---

### Task 1: Deduplicate `getAuthUser()` with React `cache()`

**Files:**
- Modify: `lib/authorization.ts:1-73`

**Interfaces:**
- Consumes: `getSession()` from `lib/session.ts`, `prisma` from `lib/prisma.ts`
- Produces: `getAuthUser(): Promise<AuthUser | null>` — same signature, same return type. Now deduplicated per React render pass.

**Why:** `getAuthUser()` is called in ~60+ places. Within a single SSR page render (e.g., dashboard page calls `requireAuth()`, then passes user to child server components that also call `requireAuth()` or `requireRole()`), the same DB query fires multiple times. React `cache()` deduplicates calls with the same arguments within a single server request.

- [ ] **Step 1: Add React `cache()` import and wrap `getAuthUser`**

In `lib/authorization.ts`, change the existing implementation:

```typescript
// BEFORE (line 1-6):
import "server-only";
import { getSession } from "./session";
import prisma from "./prisma";
import { logger } from "./logger";
import { redirect } from "next/navigation";
import { isConnectionError } from "./db-error";

// AFTER:
import "server-only";
import { cache } from "react";
import { getSession } from "./session";
import prisma from "./prisma";
import { logger } from "./logger";
import { redirect } from "next/navigation";
import { isConnectionError } from "./db-error";
```

Then replace the `getAuthUser` function (lines 36-73):

```typescript
// BEFORE:
export async function getAuthUser(): Promise<AuthUser | null> {
    const session = await getSession();
    if (!session?.userId) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { NIK: session.userId },
            select: {
                NIK: true,
                email: true,
                name: true,
                role: true,
                branchNames: true,
                areaNames: true,
                mustChangePassword: true,
                deletedAt: true,
            },
        });

        if (!user || user.deletedAt) return null;

        return user as AuthUser;
    } catch (error) {
        if (isConnectionError(error)) {
            throw new Error(
                "Tidak dapat terhubung ke server. Periksa koneksi jaringan Anda.",
            );
        }
        logger.error(
            { operation: "getAuthUser" },
            "Failed to fetch auth user",
            error,
        );
        throw new Error(
            "Terjadi kesalahan saat mengambil data pengguna. Silakan coba lagi.",
        );
    }
}

// AFTER:
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
    const session = await getSession();
    if (!session?.userId) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { NIK: session.userId },
            select: {
                NIK: true,
                email: true,
                name: true,
                role: true,
                branchNames: true,
                areaNames: true,
                mustChangePassword: true,
                deletedAt: true,
            },
        });

        if (!user || user.deletedAt) return null;

        return user as AuthUser;
    } catch (error) {
        if (isConnectionError(error)) {
            throw new Error(
                "Tidak dapat terhubung ke server. Periksa koneksi jaringan Anda.",
            );
        }
        logger.error(
            { operation: "getAuthUser" },
            "Failed to fetch auth user",
            error,
        );
        throw new Error(
            "Terjadi kesalahan saat mengambil data pengguna. Silakan coba lagi.",
        );
    }
});
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds without type errors. The function signature hasn't changed — all 60+ call sites remain valid.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`, navigate to `/dashboard`.
Expected: Dashboard loads correctly, user data appears. No errors in terminal.

- [ ] **Step 4: Commit**

```bash
git add lib/authorization.ts
git commit -m "perf: deduplicate getAuthUser with React cache()

Wraps getAuthUser in React cache() so that multiple calls within
a single SSR render tree (layout → page → components) hit the DB
only once. Reduces auth queries from N-per-render to 1-per-render."
```

---

### Task 2: Cache `getReportSlaDays()` and `getPjumPolicySettings()` with `unstable_cache`

**Files:**
- Modify: `lib/app-settings.ts:177-216`
- Modify: `app/dashboard/settings/page.tsx` (add `revalidateTag` on save)

**Interfaces:**
- Consumes: `prisma` from `lib/prisma.ts`, `getAppSettings()` from same file
- Produces:
  - `getReportSlaDays(): Promise<Partial<Record<ReportStatusKey, number>>>` — same signature, now cached 5min
  - `getPjumPolicySettings(): Promise<{ pendingStaleDays: number; weeklyAdvanceAmount: number; periodDays: number }>` — same signature, now cached 5min
  - `revalidateAppSettingsCache(): void` — new helper to bust cache on admin save

**Why:** These settings almost never change (admin updates them maybe once a month), yet they're queried on every dashboard load by every user. With 100 users, that's 100+ identical queries that can be served from cache.

- [ ] **Step 1: Add cached versions of settings functions**

In `lib/app-settings.ts`, add the import at the top (after existing imports on line 3):

```typescript
// ADD after line 3:
import { unstable_cache, revalidateTag } from "next/cache";
```

Then replace the `getReportSlaDays` function (lines 177-193):

```typescript
// BEFORE:
export async function getReportSlaDays(): Promise<
    Partial<Record<ReportStatusKey, number>>
> {
    const settings = await getAppSettings(
        REPORT_SLA_SETTING_FIELDS.map((field) => field.key),
    );

    return Object.fromEntries(
        REPORT_SLA_SETTING_FIELDS.map((field) => {
            const fallback = DEFAULT_REPORT_SLA_DAYS[field.status] ?? 1;
            return [
                field.status,
                parsePositiveInteger(settings[field.key]?.value, fallback),
            ];
        }),
    ) as Partial<Record<ReportStatusKey, number>>;
}

// AFTER:
export const getReportSlaDays = unstable_cache(
    async (): Promise<Partial<Record<ReportStatusKey, number>>> => {
        const settings = await getAppSettings(
            REPORT_SLA_SETTING_FIELDS.map((field) => field.key),
        );

        return Object.fromEntries(
            REPORT_SLA_SETTING_FIELDS.map((field) => {
                const fallback = DEFAULT_REPORT_SLA_DAYS[field.status] ?? 1;
                return [
                    field.status,
                    parsePositiveInteger(settings[field.key]?.value, fallback),
                ];
            }),
        ) as Partial<Record<ReportStatusKey, number>>;
    },
    ["report-sla-days"],
    { revalidate: 300, tags: ["app-settings"] },
);
```

Then replace the `getPjumPolicySettings` function (lines 195-216):

```typescript
// BEFORE:
export async function getPjumPolicySettings() {
    const settings = await getAppSettings([
        SETTING_KEYS.PJUM_PENDING_STALE_DAYS,
        SETTING_KEYS.PJUM_WEEKLY_ADVANCE_AMOUNT,
        SETTING_KEYS.PJUM_PERIOD_DAYS,
    ]);

    return {
        pendingStaleDays: parsePositiveInteger(
            settings[SETTING_KEYS.PJUM_PENDING_STALE_DAYS]?.value,
            DEFAULT_PJUM_POLICY_SETTINGS.pendingStaleDays,
        ),
        weeklyAdvanceAmount: parsePositiveInteger(
            settings[SETTING_KEYS.PJUM_WEEKLY_ADVANCE_AMOUNT]?.value,
            DEFAULT_PJUM_POLICY_SETTINGS.weeklyAdvanceAmount,
        ),
        periodDays: parsePositiveInteger(
            settings[SETTING_KEYS.PJUM_PERIOD_DAYS]?.value,
            DEFAULT_PJUM_POLICY_SETTINGS.periodDays,
        ),
    };
}

// AFTER:
export const getPjumPolicySettings = unstable_cache(
    async () => {
        const settings = await getAppSettings([
            SETTING_KEYS.PJUM_PENDING_STALE_DAYS,
            SETTING_KEYS.PJUM_WEEKLY_ADVANCE_AMOUNT,
            SETTING_KEYS.PJUM_PERIOD_DAYS,
        ]);

        return {
            pendingStaleDays: parsePositiveInteger(
                settings[SETTING_KEYS.PJUM_PENDING_STALE_DAYS]?.value,
                DEFAULT_PJUM_POLICY_SETTINGS.pendingStaleDays,
            ),
            weeklyAdvanceAmount: parsePositiveInteger(
                settings[SETTING_KEYS.PJUM_WEEKLY_ADVANCE_AMOUNT]?.value,
                DEFAULT_PJUM_POLICY_SETTINGS.weeklyAdvanceAmount,
            ),
            periodDays: parsePositiveInteger(
                settings[SETTING_KEYS.PJUM_PERIOD_DAYS]?.value,
                DEFAULT_PJUM_POLICY_SETTINGS.periodDays,
            ),
        };
    },
    ["pjum-policy-settings"],
    { revalidate: 300, tags: ["app-settings"] },
);
```

Add the revalidation helper at the end of the file (after line 221):

```typescript
/**
 * Call after admin updates any app setting to bust the cache immediately.
 */
export function revalidateAppSettingsCache() {
    revalidateTag("app-settings");
}
```

- [ ] **Step 2: Add cache revalidation to settings save action**

Find the settings save action. In `app/dashboard/settings/page.tsx` or its associated actions file, find where `updateAppSetting` is called and add `revalidateAppSettingsCache()` after a successful save.

Search for the settings update action:

```bash
grep -rn "updateAppSetting" app/dashboard/settings/
```

In the action that calls `updateAppSetting`, add after the successful update:

```typescript
import { revalidateAppSettingsCache } from "@/lib/app-settings";

// ... after successful updateAppSetting calls:
revalidateAppSettingsCache();
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds. All callers of `getReportSlaDays()` and `getPjumPolicySettings()` still work because the return types are identical.

- [ ] **Step 4: Commit**

```bash
git add lib/app-settings.ts app/dashboard/settings/
git commit -m "perf: cache app settings with unstable_cache (5min TTL)

getReportSlaDays and getPjumPolicySettings now use unstable_cache
with 5-minute revalidation and 'app-settings' tag. Admin settings
save calls revalidateTag to bust immediately. Eliminates ~100+
identical DB queries per minute across all concurrent users."
```

---

### Task 3: Cache `getAdminBranchHierarchy()` with `unstable_cache`

**Files:**
- Modify: `app/dashboard/queries.ts:1101-1139`
- Modify: `app/dashboard/users/actions.ts` (revalidate on user create/update)
- Modify: `app/dashboard/stores/actions.ts` (revalidate on store changes)

**Interfaces:**
- Consumes: `prisma` from `lib/prisma.ts`
- Produces: `getAdminBranchHierarchy(): Promise<AdminBranchHierarchy>` — same signature, now cached 10min
- Produces: `revalidateBranchHierarchyCache(): void` — new helper

**Why:** Branch hierarchy is built by fetching ALL users' branchNames. This data only changes when users are added/removed. With 100 concurrent users, this identical query fires every time an admin or BMC loads their dashboard.

- [ ] **Step 1: Add `unstable_cache` import to queries.ts**

At the top of `app/dashboard/queries.ts`, add the import (after existing imports, around line 1-16):

```typescript
// ADD to existing imports:
import { unstable_cache, revalidateTag } from "next/cache";
```

- [ ] **Step 2: Wrap `getAdminBranchHierarchy` with `unstable_cache`**

Replace lines 1101-1139:

```typescript
// BEFORE:
export async function getAdminBranchHierarchy(): Promise<AdminBranchHierarchy> {
    const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: { branchNames: true },
    });

    const optionNames = Array.from(
        new Set(
            users
                .map((user) => user.branchNames[0])
                .filter(
                    (name) =>
                        name &&
                        name.trim() !== "" &&
                        name !== EXCLUDED_ADMIN_BRANCH_NAME,
                ),
        ),
    ).sort((a, b) => a.localeCompare(b, "id-ID"));

    const parentMap = new Map<string, string>();
    for (const user of users) {
        const parentBranch = user.branchNames[0];
        if (!parentBranch || parentBranch === EXCLUDED_ADMIN_BRANCH_NAME) {
            continue;
        }

        for (const branchName of user.branchNames) {
            if (!branchName || branchName === EXCLUDED_ADMIN_BRANCH_NAME) {
                continue;
            }
            parentMap.set(branchName, parentBranch);
        }
    }

    return {
        options: optionNames.map((name) => ({ name })),
        parentMap,
    };
}

// AFTER:
// unstable_cache cannot serialize Map, so we store entries and reconstruct.
type AdminBranchHierarchySerialized = {
    options: AdminBranchOption[];
    parentEntries: [string, string][];
};

const getAdminBranchHierarchyCached = unstable_cache(
    async (): Promise<AdminBranchHierarchySerialized> => {
        const users = await prisma.user.findMany({
            where: { deletedAt: null },
            select: { branchNames: true },
        });

        const optionNames = Array.from(
            new Set(
                users
                    .map((user) => user.branchNames[0])
                    .filter(
                        (name) =>
                            name &&
                            name.trim() !== "" &&
                            name !== EXCLUDED_ADMIN_BRANCH_NAME,
                    ),
            ),
        ).sort((a, b) => a.localeCompare(b, "id-ID"));

        const parentMap = new Map<string, string>();
        for (const user of users) {
            const parentBranch = user.branchNames[0];
            if (!parentBranch || parentBranch === EXCLUDED_ADMIN_BRANCH_NAME) {
                continue;
            }

            for (const branchName of user.branchNames) {
                if (!branchName || branchName === EXCLUDED_ADMIN_BRANCH_NAME) {
                    continue;
                }
                parentMap.set(branchName, parentBranch);
            }
        }

        return {
            options: optionNames.map((name) => ({ name })),
            parentEntries: Array.from(parentMap.entries()),
        };
    },
    ["admin-branch-hierarchy"],
    { revalidate: 600, tags: ["branch-hierarchy"] },
);

export async function getAdminBranchHierarchy(): Promise<AdminBranchHierarchy> {
    const cached = await getAdminBranchHierarchyCached();
    return {
        options: cached.options,
        parentMap: new Map(cached.parentEntries),
    };
}

/**
 * Call after user or branch data changes to bust hierarchy cache.
 */
export function revalidateBranchHierarchyCache() {
    revalidateTag("branch-hierarchy");
}
```

- [ ] **Step 3: Add revalidation calls to user management actions**

In `app/dashboard/users/actions.ts`, find actions that create/update/delete users. Add after successful mutations:

```typescript
import { revalidateBranchHierarchyCache } from "@/app/dashboard/queries";

// After any user create/update/delete:
revalidateBranchHierarchyCache();
```

Do the same in `app/dashboard/stores/actions.ts` for store create/update if stores affect branch data.

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds. `getAdminBranchHierarchy()` return type is identical. All callers (queries.ts, admin/export/queries.ts) work unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/queries.ts app/dashboard/users/actions.ts app/dashboard/stores/actions.ts
git commit -m "perf: cache branch hierarchy with unstable_cache (10min TTL)

getAdminBranchHierarchy now cached for 10 minutes. Serializes Map
as entries array for cache compatibility. Revalidated on user or
store mutations. Eliminates redundant full-user-table scan per
admin/BMC dashboard load."
```

---

### Task 4: Consolidate `getUserStats` — 6 Parallel Counts to 1 GroupBy

**Files:**
- Modify: `app/dashboard/queries.ts:38-114`

**Interfaces:**
- Consumes: `prisma` from `lib/prisma.ts`, `ARCHIVED_PREVENTIVE_STATUS` from `lib/report-status.ts`
- Produces: `getUserStats(userId: string): Promise<{ totalReports, needsAction, waitingReview, inProgress, completed, activeReports }>` — same return type

**Why:** 6 parallel `prisma.report.count()` calls each acquire a separate connection from the pool. A single `groupBy` query returns all status counts in one query, using 1 connection instead of 6.

- [ ] **Step 1: Replace `getUserStats` implementation**

In `app/dashboard/queries.ts`, replace lines 38-114:

```typescript
// AFTER:
export async function getUserStats(userId: string) {
    try {
        const statusCounts = await prisma.report.groupBy({
            by: ["status"],
            where: {
                createdByNIK: userId,
                status: { not: ARCHIVED_PREVENTIVE_STATUS },
            },
            _count: { _all: true },
        });

        const countMap = new Map(
            statusCounts.map((row) => [row.status, row._count._all]),
        );

        const needsActionStatuses = [
            "ESTIMATION_APPROVED",
            "ESTIMATION_REJECTED_REVISION",
            "REVIEW_REJECTED_REVISION",
        ];
        const waitingReviewStatuses = [
            "PENDING_ESTIMATION",
            "PENDING_CHECKLIST_REVIEW",
            "PENDING_REVIEW",
            "APPROVED_BMC",
        ];

        let totalReports = 0;
        let needsAction = 0;
        let waitingReview = 0;
        let inProgress = 0;
        let completed = 0;

        for (const [status, count] of countMap) {
            totalReports += count;
            if (needsActionStatuses.includes(status)) needsAction += count;
            if (waitingReviewStatuses.includes(status)) waitingReview += count;
            if (status === "IN_PROGRESS") inProgress += count;
            if (status === "COMPLETED") completed += count;
        }

        const activeReports = totalReports - completed;

        return {
            totalReports,
            needsAction,
            waitingReview,
            inProgress,
            completed,
            activeReports,
        };
    } catch (error) {
        logger.error(
            { operation: "getUserStats", userId },
            "Failed to fetch user stats",
            error,
        );
        throw error;
    }
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds. Return type is identical.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, log in as a BMS user, navigate to `/dashboard`.
Expected: All stat cards show correct numbers matching the previous behavior.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/queries.ts
git commit -m "perf: consolidate getUserStats from 6 parallel counts to 1 groupBy

Replaces 6 parallel prisma.report.count() calls with a single
groupBy query. Reduces connection pool usage from 6 simultaneous
connections to 1 per BMS dashboard load."
```

---

### Task 5: Consolidate `getBMCStats` and `getBNMStats` — Same Pattern

**Files:**
- Modify: `app/dashboard/queries.ts:122-214`

**Interfaces:**
- Consumes: `prisma`, `OPERATIONAL_EXCLUDED_REPORT_STATUSES`
- Produces:
  - `getBMCStats(branchNames: string[]): Promise<{ totalReports, needsReview, inProgress, completed }>` — same
  - `getBNMStats(branchNames: string[]): Promise<{ pendingFinalApproval, completed, totalReports }>` — same

- [ ] **Step 1: Replace `getBMCStats` implementation**

In `app/dashboard/queries.ts`, replace lines 122-172:

```typescript
// AFTER:
export async function getBMCStats(branchNames: string[]) {
    try {
        const statusCounts = await prisma.report.groupBy({
            by: ["status"],
            where: {
                branchName: { in: branchNames },
                status: {
                    notIn: [...OPERATIONAL_EXCLUDED_REPORT_STATUSES],
                },
            },
            _count: { _all: true },
        });

        const countMap = new Map(
            statusCounts.map((row) => [row.status, row._count._all]),
        );

        const needsReviewStatuses = [
            "PENDING_ESTIMATION",
            "PENDING_CHECKLIST_REVIEW",
            "PENDING_REVIEW",
        ];
        const inProgressStatuses = [
            "ESTIMATION_APPROVED",
            "IN_PROGRESS",
        ];

        let totalReports = 0;
        let needsReview = 0;
        let inProgress = 0;
        const completed = countMap.get("COMPLETED") ?? 0;

        for (const [status, count] of countMap) {
            totalReports += count;
            if (needsReviewStatuses.includes(status)) needsReview += count;
            if (inProgressStatuses.includes(status)) inProgress += count;
        }

        return {
            totalReports,
            needsReview,
            inProgress,
            completed,
        };
    } catch (error) {
        logger.error(
            { operation: "getBMCStats", branchNames },
            "Failed to fetch BMC stats",
            error,
        );
        throw error;
    }
}
```

- [ ] **Step 2: Replace `getBNMStats` implementation**

Replace the `getBNMStats` function (find it after `getBMCStats`):

```typescript
// AFTER:
export async function getBNMStats(branchNames: string[]) {
    try {
        const statusCounts = await prisma.report.groupBy({
            by: ["status"],
            where: {
                branchName: { in: branchNames },
                status: {
                    notIn: [...OPERATIONAL_EXCLUDED_REPORT_STATUSES],
                },
            },
            _count: { _all: true },
        });

        const countMap = new Map(
            statusCounts.map((row) => [row.status, row._count._all]),
        );

        let totalReports = 0;
        for (const count of countMap.values()) {
            totalReports += count;
        }

        return {
            pendingFinalApproval: countMap.get("APPROVED_BMC") ?? 0,
            completed: countMap.get("COMPLETED") ?? 0,
            totalReports,
        };
    } catch (error) {
        logger.error(
            { operation: "getBNMStats", branchNames },
            "Failed to fetch BNM stats",
            error,
        );
        throw error;
    }
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds. Return types are identical.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/queries.ts
git commit -m "perf: consolidate getBMCStats and getBNMStats to single groupBy each

getBMCStats: 4 parallel counts → 1 groupBy (saves 3 connections)
getBNMStats: 3 parallel counts → 1 groupBy (saves 2 connections)"
```

---

### Task 6: Increase Autosave Interval from 10s to 17s

**Files:**
- Modify: `app/reports/(bms)/create/hooks/use-server-draft-autosave.ts:7`

**Interfaces:**
- Produces: `SERVER_DRAFT_IDLE_MS = 17_000` — increased from 10_000

**Why:** With 50 BMS users creating reports, the 10-second autosave fires ~300 DB queries per minute just from autosave. Increasing to 17 seconds reduces this significantly while still providing fast draft protection.

- [ ] **Step 1: Update the constant**

In `app/reports/(bms)/create/hooks/use-server-draft-autosave.ts`, change line 7:

```typescript
// BEFORE:
export const SERVER_DRAFT_IDLE_MS = 10_000;

// AFTER:
export const SERVER_DRAFT_IDLE_MS = 17_000;
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "app/reports/(bms)/create/hooks/use-server-draft-autosave.ts"
git commit -m "perf: increase autosave interval from 10s to 17s

Reduces autosave DB load significantly under high concurrency,
while keeping very fast draft protection for field users."
```

---

## Summary of Impact

| Change | Connections saved per request | Scope |
|---|---|---|
| Task 1: `cache(getAuthUser)` | 1-3 per page render | All 60+ call sites |
| Task 2: Cache settings (5min) | 2-3 per page render × all users | All dashboard pages |
| Task 3: Cache branch hierarchy (10min) | 1 full-table scan × all admin/BMC | Admin + BMC dashboards |
| Task 4: `getUserStats` groupBy | 5 connections saved | Every BMS dashboard load |
| Task 5: `getBMC/BNMStats` groupBy | 2-3 connections saved | Every BMC/BNM dashboard load |
| Task 6: Autosave 10s→30s | ~200 queries/min reduction | All BMS creating reports |

**Estimated total reduction:** 60-80% fewer database connections under peak load.
