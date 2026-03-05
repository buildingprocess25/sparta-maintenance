# SPARTA Maintenance — Copilot Instructions

## Project Overview

Sistem Pelaporan dan Tracking Aset Maintenance untuk PT Sumber Alfaria Trijaya. Next.js 16 App Router, TypeScript 5, Prisma 7, PostgreSQL (Neon), Supabase (photos), JWT sessions. UI in **Bahasa Indonesia**.

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

Authentication guard: use `requireAuth()` from `@/lib/authorization` in server components. Returns `AuthUser` with `{ NIK, email, name, role, branchNames[] }`.

### Report Status Flow (10 states)

```
DRAFT → PENDING_ESTIMATION → ESTIMATION_APPROVED → IN_PROGRESS → PENDING_REVIEW → APPROVED_BMC → COMPLETED
                          ↘ ESTIMATION_REJECTED_REVISION (BMS revises & resubmits)
                          ↘ ESTIMATION_REJECTED (closed)
                                                              ↘ REVIEW_REJECTED_REVISION (BMS revises work)
```

### Key Directories

- `app/reports/actions/` — Server Actions (submit, approve-estimation, review-completion, approve-final, etc.)
- `app/dashboard/queries.ts` — DB queries with `"server-only"` marker; one function per role
- `app/reports/[reportNumber]/_components/` — sub-components for report detail view
- `lib/authorization.ts` — `requireAuth()`, `getAuthUser()`, `AuthorizationError`
- `lib/checklist-data.ts` — static checklist categories & items (source of truth)
- `prisma/schema.prisma` — schema with `ReportStatus` and `ActivityAction` enums

## Conventions

### Server Actions pattern

```ts
// app/reports/actions/some-action.ts
"use server";
import { requireAuth } from "@/lib/authorization";
import { logger } from "@/lib/logger";

export async function someAction(reportNumber: string, notes?: string) {
    const user = await requireAuth();
    // ... validate, mutate DB, log ActivityLog entry
    return { error: null } | { error: "message" };
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

### Audit trail — always log to ActivityLog

Every state-changing action must write an `ActivityLog` entry:

```ts
await prisma.activityLog.create({
    data: { reportNumber, actorNIK: user.NIK, action: "SUBMITTED", notes },
});
```

### Queries pattern

- Files use `"server-only"` at top, never called from client components
- Scope queries by role: BMS → `createdByNIK`, BMC/BNM → `branchName: { in: branchNames }`
- Use structured logging: `logger.error({ operation: "fnName", userId }, "msg", error)`

### Component organization

- Page-level sub-components go in `_components/` (underscore prefix, not shown in routes)
- Shared types extracted to `_components/types.ts`
- Heavy components split into focused files (checklist-tab, history-tab, etc.)

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
