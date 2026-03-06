# SPARTA Maintenance — Copilot Instructions

## Project Overview

Sistem Pelaporan dan Tracking Aset Maintenance untuk PT Sumber Alfaria Trijaya. Next.js 16 App Router, TypeScript 5, Prisma 7, PostgreSQL (Neon), Supabase (photos), JWT sessions. UI in **Bahasa Indonesia**.

## Development Commands

```bash
npm run dev           # start dev server
npm run db:push       # push schema changes (uses DIRECT_URL via prisma.config.ts)
npm run db:generate   # regenerate Prisma client after schema changes
npm run db:studio     # Prisma Studio GUI
npm run create-user   # create user via CLI (tsx scripts/create-user.ts)
npm run db:seed       # seed DB
```

Always run `db:push && db:generate` together after editing `prisma/schema.prisma`.
`prisma.config.ts` feeds `DIRECT_URL` (non-pooled) to Prisma CLI — this is separate from `DATABASE_URL` (pooled, used at runtime).

## UI Design Approach

**Desktop-first** for all roles except BMS on `/reports/create` (mobile-first due to field mobility).

Typography rules (full detail in `.cursor/rules/ui-text-sizing.md`):

- Stat card number: `text-3xl font-bold tabular-nums`
- Stat card label: `text-sm font-semibold` — **never `text-xs` for primary labels**
- Body / table cells: `text-sm`
- Secondary / helper text only: `text-xs text-muted-foreground`
- Avoid `text-[10px]`, `text-[11px]`, `hidden md:block` for important content

## Architecture

### Role-Based Access

Four roles with separate dashboard components under `app/dashboard/_components/`:

- `BMS` → `bms-dashboard.tsx` — creates reports, performs work
- `BMC` → `bmc-dashboard.tsx` — reviews estimations & work completion
- `BNM_MANAGER` → `bnm-dashboard.tsx` — final approval
- `ADMIN` → `admin-dashboard.tsx` — system management

Auth helpers in `lib/authorization.ts` — use the narrowest helper available:

- `requireAuth()` — any logged-in user; redirects to `/login` if no session
- `requireRole("BMC")` or `requireRole(["BMC", "ADMIN"])` — throws `AuthorizationError` if wrong role
- `requireOwnership(report.createdByNIK)` — ADMIN bypasses; others must own the resource
- `requireBranchAccess(branchName)` — ADMIN bypasses; others must have branch in `branchNames[]`

All return `AuthUser`: `{ NIK, email, name, role, branchNames[] }`.

### Report Status Flow (10 states)

```
DRAFT → PENDING_ESTIMATION → ESTIMATION_APPROVED → IN_PROGRESS → PENDING_REVIEW → APPROVED_BMC → COMPLETED
                          ↘ ESTIMATION_REJECTED_REVISION (BMS revises & resubmits)
                          ↘ ESTIMATION_REJECTED (closed)
                                                              ↘ REVIEW_REJECTED_REVISION (BMS revises work)
```

### Key Directories

- `app/reports/actions/` — Server Actions: `submit.ts`, `draft.ts`, `approve-estimation.ts`, `review-completion.ts`, `approve-final.ts`, `resubmit.ts`, `start-work.ts`, etc.
- `app/reports/actions/types.ts` — shared `DraftData`, `ChecklistItemData`, `BmsEstimationData`, `ReportFilters` types + `draftDataSchema` (Zod)
- `app/dashboard/queries.ts` — DB queries (`"server-only"`); one function per role
- `app/reports/[reportNumber]/_components/` — detail view sub-components (checklist-tab, history-tab, status-timeline, etc.)
- `lib/authorization.ts` — all auth/CSRF helpers
- `lib/checklist-data.ts` — static checklist categories & items; **single source of truth** for item IDs
- `lib/report-helpers.ts` — `generateReportNumber()` with Postgres advisory lock; `PrismaTx` type for passing tx client

### Data Model Notes

`Report.items` and `Report.estimations` are **JSONB columns** (typed as `Json`), not relational. They hold `ReportItemJson[]` and `MaterialEstimationJson[]` respectively (see `types/report.ts`). Never create new child tables for these — use the JSONB pattern.

Supabase photo storage path: `{branchName}/{storeCode}/DRAFT-{NIK}/{itemId}_{name}.ext` while drafting → moved to `{branchName}/{storeCode}/{reportNumber}/{itemId}_{name}.ext` on submit. Use `getSupabaseClient()` from `lib/supabase.ts` (lazy singleton).

## Conventions

### Server Actions pattern

Every mutating action must: (1) call `requireRole` or `requireAuth`, (2) call `validateCSRF(await headers())`, (3) validate input with Zod, (4) mutate DB, (5) write `ActivityLog`, (6) call `revalidatePath`.

```ts
// app/reports/actions/some-action.ts
"use server";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export async function someAction(reportNumber: string, notes?: string) {
    const user = await requireRole("BMC");
    await validateCSRF(await headers());
    // ... validate input, mutate DB
    await prisma.activityLog.create({
        data: {
            reportNumber,
            actorNIK: user.NIK,
            action: "ESTIMATION_APPROVED",
            notes,
        },
    });
    revalidatePath(`/reports/${reportNumber}`);
    return { error: null };
}
```

### Calling actions from client components

```tsx
const [isPending, startTransition] = useTransition();
const handleAction = () =>
    startTransition(async () => {
        const result = await someAction(reportNumber);
        if (result.error)
            toast.error("Gagal ...", { description: result.error });
        else toast.success("Berhasil!");
    });
```

### Queries pattern

- Add `"server-only"` at top of every query file — never import into client components
- Scope by role: BMS → `createdByNIK: user.NIK`; BMC/BNM → `branchName: { in: user.branchNames }`
- Always filter out `DRAFT` from branch-scoped queries (BMC/BNM should never see drafts)
- Structured logging: `logger.error({ operation: "fnName", userId: user.NIK }, "message", error)`

### Component organization

- Page-level sub-components go in `_components/` (underscore prefix = not a route)
- Shared TypeScript types extracted to `_components/types.ts`
- Heavy components split into focused files (checklist-tab.tsx, history-tab.tsx, etc.)

## Database

- `ReportStatus` enum — 10 values; always filter DRAFT out from branch-scoped queries
- `ActivityAction` enum — 11 values for audit trail
- `branchNames` is `String[]` on User — BMC/BNM scope all queries with `branchName: { in: branchNames }`
- Run schema changes: `npm run db:push && npm run db:generate`

## Development

```bash
npm run dev          # start dev server
npm run db:studio    # Prisma Studio
npm run create-user  # create user via CLI
```

Environment requires: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GMAIL_*` for email.
