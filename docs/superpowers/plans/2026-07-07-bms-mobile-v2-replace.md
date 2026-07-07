# BMS Mobile V2 Replace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace only the BMS-facing mobile UI in this project with the pages already built in `E:/APROJECT/sparta-maintenance-v2`, while binding all data to the current database/actions in this project.

**Architecture:** Copy the v2 mobile presentation layer into this project, but do not copy v2 mock data. Keep the current project as the source of truth for auth, Prisma queries, report actions, upload flow, notification flow, and business logic. Routes that do not exist in v2 stay on the current project UI for now.

**Tech Stack:** Next.js 16 App Router, React Server Components, Prisma, Tailwind CSS v4, shadcn/ui `radix-vega`, lucide-react.

## Global Constraints

- Scope is only role `BMS`.
- Skip landing page and login page.
- Copy/replace only pages that exist in `sparta-maintenance-v2`: BMS dashboard, activity, and create report.
- Pages not built in v2 stay on the current implementation for now.
- Mobile only. Do not add desktop layout, desktop breakpoints, sidebar, or wide table redesign for BMS in this pass.
- Do not change database schema or run Prisma migration commands.
- Do not use v2 mock arrays in production code.
- Use current project actions/queries and current schema.
- Before UI implementation, follow `.agents/AI_RULES.md`: use shadcn components first and check shadcn registry/components.
- Keep ADMIN, BMC, and BNM_MANAGER pages unchanged.
- Delete code only when `rg` proves it is unused by the BMS replacement and not shared by other roles.

---

## Current Source/Target Map

| v2 source | Current target | Action |
|---|---|---|
| `E:/APROJECT/sparta-maintenance-v2/app/dashboard/(bms)/page.tsx` | `app/dashboard/_components/bms-dashboard.tsx` | Replace BMS dashboard visual with v2 mobile shell, bind to `getUserStats()` and `getBMSActivity()`. |
| `E:/APROJECT/sparta-maintenance-v2/app/activity/page.tsx` | `app/activity/page.tsx` + BMS-only component | Replace only BMS activity render. Keep BMC, BNM_MANAGER, ADMIN activity behavior. |
| `E:/APROJECT/sparta-maintenance-v2/app/reports/new/page.tsx` | `app/reports/(bms)/create/*` | Port the v2 create-report visual flow into the existing BMS create route `/reports/create`. Bind to current `submitReport`, draft, upload, checklist, store query, and estimation logic. |
| `E:/APROJECT/sparta-maintenance-v2/components/bottom-nav.tsx` | new shared BMS mobile nav component | Copy/adapt for BMS mobile routes. Avoid broken `/settings` link. Use a menu drawer/sheet for profile actions until settings page exists. |
| `E:/APROJECT/sparta-maintenance-v2/components/header.tsx` | new shared BMS mobile header component | Copy/adapt for BMS mobile pages. |
| `E:/APROJECT/sparta-maintenance-v2/components/dashboard/dashboard-stats-section.tsx` | BMS dashboard component folder | Copy/adapt for BMS dashboard stats. |
| `E:/APROJECT/sparta-maintenance-v2/components/activity/activity-list.tsx` | BMS activity component folder | Copy/adapt for BMS activity list. |

Routes to skip because v2 has no page:

- `/reports`
- `/reports/[reportNumber]`
- `/reports/start-work`
- `/reports/complete`
- `/reports/revisi/[reportNumber]`
- settings/profile page

These stay on current project UI until v2 versions exist.

## Task 1: Add BMS Mobile Shell Components

**Files:**
- Create: `components/bms-mobile/bms-mobile-header.tsx`
- Create: `components/bms-mobile/bms-mobile-bottom-nav.tsx`
- Create: `components/bms-mobile/bms-mobile-page.tsx`

**Interfaces:**
- Produces:
  - `BmsMobileHeader(props: { title?: string; subtitle?: string; showBackButton?: boolean; backHref?: string; showNotificationDot?: boolean })`
  - `BmsMobileBottomNav(props: { activeItem: "dashboard" | "reports" | "activity" | "menu" })`
  - `BmsMobilePage(props: { children: React.ReactNode; navItem: BmsMobileNavItem; title?: string; subtitle?: string })`
- Consumes: existing shadcn `Button`, `Sheet`, `Avatar`, `Badge`, `Separator`, `DropdownMenu` only if already installed.

- [x] Copy visual structure from v2 `components/header.tsx` and `components/bottom-nav.tsx`.
- [x] Replace the `/settings` nav href with a `Sheet`/menu trigger because there is no v2 settings page.
- [x] Keep layout capped to mobile width: page content should use `max-w-lg`.
- [x] Do not add desktop sidebar or responsive desktop variants.
- [x] Use `data-icon` on icons inside buttons.
- [x] Run `rg -n "BmsMobile" components app` to confirm imports are explicit.
- [x] Run `npx tsc --noEmit`.

## Task 2: Replace BMS Dashboard With v2 Mobile UI

**Files:**
- Modify: `app/dashboard/_components/bms-dashboard.tsx`
- Create if useful: `app/dashboard/_components/bms-mobile-dashboard-stats.tsx`

**Interfaces:**
- Consumes:
  - `getUserStats(user.NIK)`
  - `getBMSActivity(user.NIK)`
  - `BmsMobilePage`
- Produces: BMS dashboard UI only. `app/dashboard/page.tsx` role switch stays unchanged.

- [ ] Remove old desktop `DashboardShell`, `DashboardMenus`, and wide layout from BMS dashboard only.
- [ ] Map current `getUserStats()` values into the v2 dashboard stat cards:
  - `needsAction` -> `Perlu Tindakan`
  - `waitingReview` -> `Menunggu Review`
  - `inProgress` -> `Dikerjakan`
  - `completed` -> `Selesai`
- [ ] Keep primary CTA: `/reports/create`.
- [ ] Keep secondary action links minimal:
  - `/reports?status=needs_action`
  - `/reports?status=waiting_review`
  - `/reports?status=in_progress`
  - `/reports?status=completed`
- [ ] Replace v2 mock activity data with `getBMSActivity(user.NIK)`.
- [ ] Use global status/action labels already available in the current project.
- [ ] Verify BMC, BNM_MANAGER, and ADMIN dashboard imports are untouched.
- [ ] Run `npx tsc --noEmit`.

## Task 3: Port v2 Create Report Visual Flow Into Current `/reports/create`

**Files:**
- Modify: `app/reports/(bms)/create/create-form.tsx`
- Keep: `app/reports/(bms)/create/page.tsx`
- Keep or adapt existing helpers under `app/reports/(bms)/create/hooks/*`
- Keep current actions under `app/reports/actions/*`

**Interfaces:**
- Consumes:
  - `stores` prop from `getStoresByBranch(user.branchNames[0])`
  - existing `submitReport`
  - existing `resubmitReport`
  - existing local draft/photo hooks
  - current `checklistCategories` and report item schema
- Produces: same `DraftData` payload currently accepted by `submitReport`.

- [ ] Do not copy v2 `STORES`, fake checklist, or fake BMS data.
- [ ] Use v2 page as visual reference for the wizard shell, store search, checklist grouping, estimation step, and review step.
- [ ] Keep current working submit payload shape; no schema change.
- [ ] Keep current Google Drive/photo upload handling.
- [ ] Keep current preventive cooldown logic.
- [ ] Keep current handler logic: BMS vs REKANAN.
- [ ] Keep current draft restore behavior.
- [ ] Split the 1600-line v2 page into existing focused current files/hooks instead of creating another huge one-file component.
- [ ] Keep mobile-only layout; no desktop tables.
- [ ] Replace custom form markup with existing shadcn `Field`, `InputGroup`, `Select`, `RadioGroup`, `Dialog`, `Collapsible`, `Badge`, `Button` where applicable.
- [ ] Run `npx tsc --noEmit`.

## Task 4: Replace BMS Activity View Only

**Files:**
- Modify: `app/activity/page.tsx`
- Create: `app/activity/_components/bms-mobile-activity-list.tsx`

**Interfaces:**
- Consumes:
  - current `getBMSActivity(user.NIK, POOL)`
  - current `ActivityItem` shape from `app/dashboard/queries.ts`
- Produces: mobile BMS activity page only.

- [ ] Keep current role switch for BNM_MANAGER, BMC, and ADMIN.
- [ ] For `user.role === "BMS"`, render the copied/adapted v2 mobile activity UI.
- [ ] Remove v2 fake `ACTIVITY_DATA`.
- [ ] Keep current search/action/date filters if they are already supported by `app/activity/page.tsx`.
- [ ] Use current route `/activity`.
- [ ] Use `BmsMobilePage` with bottom nav active item `activity`.
- [ ] Run `npx tsc --noEmit`.

## Task 5: Route Link Cleanup For BMS Mobile

**Files:**
- Modify only files touched by Tasks 1-4.

**Interfaces:**
- Consumes: current BMS routes.
- Produces: no broken links introduced by copied v2 UI.

- [ ] Ensure dashboard CTA points to `/reports/create`, not `/reports/new`.
- [ ] Bottom nav Reports points to `/reports`.
- [ ] Bottom nav Activity points to `/activity`.
- [ ] Menu action must not point to missing `/settings`.
- [ ] If menu includes change password, reuse existing `ChangePasswordDialog`.
- [ ] If menu includes logout, reuse current logout action/pattern.
- [ ] Run `rg -n '"/reports/new"|"/settings"|"/user-manual"' app components`.
- [ ] Any remaining match must be outside BMS mobile replacement or intentionally skipped.

## Task 6: Clean Unused BMS Replacement Code

**Files:**
- Delete only files proven unused.
- Do not delete shared components used by ADMIN/BMC/BNM.

**Interfaces:**
- Consumes: `rg` results.
- Produces: smaller BMS-only code path.

- [ ] Run `rg -n "DashboardShell|DashboardMenus|DashboardStats|ActivitySectionWide" app/dashboard/_components app/activity components`.
- [ ] Remove imports from BMS files when no longer used.
- [ ] Do not delete `DashboardShell`, `DashboardMenus`, or shared dashboard components if BMC/BNM still use them.
- [ ] Run `rg -n "STORES|ACTIVITY_DATA|mock|fake|dummy" app components`.
- [ ] Remove mock data introduced from v2.
- [ ] Run `npx tsc --noEmit`.

## Task 7: Mobile Visual Verification

**Files:**
- No planned source edits unless verification finds an issue.

**Interfaces:**
- Verifies BMS-only pages at mobile width.

- [ ] Start dev server only if needed for visual check.
- [ ] Check these routes at mobile viewport:
  - `/dashboard`
  - `/reports/create`
  - `/activity`
- [ ] Confirm no desktop sidebar, desktop table, or wide container appears for BMS.
- [ ] Confirm BMC/BNM/ADMIN pages still use current dashboard shell.
- [ ] Confirm photo/camera flows still open where current create flow needs them.
- [ ] Confirm all copied buttons fit mobile width.

## Verification Commands

Use these after implementation:

```bash
npx tsc --noEmit
```

Optional visual check:

```bash
npm run dev
```

Do not run database migration commands for this work.

## Acceptance Criteria

- `BMS` dashboard uses v2 mobile UI with live current-project data.
- `BMS` create report uses v2 mobile flow with current-project database/actions.
- `BMS` activity uses v2 mobile UI with current-project activity data.
- Landing and login are untouched.
- Pages not present in v2 are untouched.
- ADMIN, BMC, and BNM_MANAGER pages are untouched.
- No v2 mock data remains in BMS production code.
- No broken BMS links to `/reports/new`, `/settings`, or `/user-manual`.
- BMS mobile pages do not include desktop layout variants.
