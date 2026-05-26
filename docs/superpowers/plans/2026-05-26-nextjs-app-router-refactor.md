# Next.js App Router Structure Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the project into a cleaner Next.js App Router structure without changing URLs, permissions, or user-visible behavior.

**Architecture:** Keep `app/` focused on route entry points, layouts, loading/error files, and route handlers. Move domain code into `features/*`, keep reusable UI in `components/*`, and keep infrastructure utilities in `lib/*`. Execute this as small behavior-preserving migrations with compatibility re-exports where needed.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, Server Actions, Route Handlers, ESLint, Node/tsx assertion specs.

---

## Current Structure Findings

- `app/reports` is the largest route area with 85 files and multiple responsibilities mixed together.
- `app/dashboard` has 58 files and contains both dashboard pages and admin CRUD features.
- `app/admin` and `app/bmc/database` duplicate database-management screens and actions.
- `app/api` route handlers contain direct business logic instead of delegating to domain handlers.
- Large files that should be split during domain refactor:
  - `lib/pdf/generate-report-pdf.ts` around 2486 lines.
  - `app/reports/pjum/_components/pjum-view.tsx` around 1367 lines.
  - `app/reports/(bms)/start-work/start-work-form.tsx` around 877 lines.
  - `app/reports/_components/approval-reports-list.tsx` around 867 lines.
  - `app/reports/(bms)/complete/complete-form.tsx` around 691 lines.
  - `app/dashboard/queries.ts` around 663 lines.
  - `app/admin/database/actions.ts` and `app/bmc/database/actions.ts` are near-duplicates.

## Target Rules

- `app/**` should mostly contain:
  - `page.tsx`
  - `layout.tsx`
  - `loading.tsx`
  - `error.tsx`
  - `not-found.tsx`
  - `route.ts`
  - very small route-local `_components` only when a component has no reuse outside that route.
- Domain code goes under `features/<domain>`.
- Server Actions go under `features/<domain>/server/actions`.
- Query/data functions go under `features/<domain>/server/queries`.
- Route handlers in `app/api/**/route.ts` should delegate to `features/<domain>/server/handlers`.
- Global reusable hooks go under `hooks/*`; domain hooks go under `features/<domain>/hooks`.
- `components/ui` remains shadcn/base UI only.
- `components/layout` remains app-wide layout primitives only.
- `lib/*` remains infrastructure or cross-domain pure utility code only.
- URLs must not change. Route groups like `app/(auth)/login/page.tsx` are allowed because they preserve `/login`.
- Avoid `src/` migration in this pass. It is cosmetic, high churn, and not required for App Router standards.

## Target Top-Level Structure

```text
app/
  (auth)/
  (main)/
  api/
  layout.tsx
  error.tsx
  globals.css

components/
  layout/
  ui/
  shared/

features/
  activity/
  admin/
  auth/
  dashboard/
  database-management/
  dev-tools/
  pjum/
  reports/
    bms/
      complete/
      create/
      edit/
      revisi/
      start-work/
    detail/
    list/
    server/
    shared/
  storage/

hooks/
lib/
  email/
  google-drive/
  pdf/
  prisma.ts
  logger.ts
types/
```

## Refactor Policy

- Do not mix behavior changes with structure changes.
- Prefer `git mv` for file moves so history survives.
- After every small migration, run `npx tsc --noEmit`.
- After every domain migration, run `npx eslint <touched paths>`.
- After each phase, run `npm run build`.
- Keep temporary compatibility re-exports for high-traffic imports, then remove them in a cleanup phase.

---

### Task 1: Create A Safety Baseline

**Files:**
- Read: `git status --short`
- Read: `package.json`
- Read: `tsconfig.json`
- Read: `eslint.config.mjs`
- Modify: none

- [ ] **Step 1: Record current dirty state**

Run:

```powershell
git status --short
```

Expected: current local changes are visible and no unrelated file is reverted.

- [ ] **Step 2: Run baseline verification**

Run:

```powershell
npx tsc --noEmit
npx eslint app components hooks lib types
```

Expected: TypeScript and lint pass before structural changes. If not, record existing failures before continuing.

- [ ] **Step 3: Run existing assertion specs**

Run the specs that exist today:

```powershell
npx tsx lib/realisasi.spec.ts
npx tsx lib/storage/photo-url.spec.ts
npx tsx app/api/dev/revise-pjum/membership.spec.ts
```

Expected: commands exit successfully with no assertion errors.

---

### Task 2: Add Architecture Documentation

**Files:**
- Create: `docs/architecture/app-router-structure.md`

- [ ] **Step 1: Document folder ownership**

Create `docs/architecture/app-router-structure.md` with:

```markdown
# App Router Structure

## Rules

- `app/` owns routes, layouts, loading/error files, and API route entry points.
- `features/` owns domain UI, domain hooks, server actions, server queries, and domain-specific helpers.
- `components/` owns reusable UI that is not domain-specific.
- `hooks/` owns reusable client hooks.
- `lib/` owns infrastructure and cross-domain utilities.
- `types/` owns compatibility/global types only.

## Route Entry Points

Route files should be thin. They import from `features/*` and should not contain large business logic.

## Server Actions

Server Actions live in `features/<domain>/server/actions/*` and include `"use server"` at the file top.

## Route Handlers

`app/api/**/route.ts` files should only parse HTTP concerns and delegate to `features/<domain>/server/handlers/*`.
```

- [ ] **Step 2: Verify docs-only change**

Run:

```powershell
git diff --check docs/architecture/app-router-structure.md
```

Expected: no whitespace errors.

---

### Task 3: Introduce Feature Directories Without Moving Behavior

**Files:**
- Create directories:
  - `features/activity`
  - `features/admin`
  - `features/auth`
  - `features/dashboard`
  - `features/database-management`
  - `features/dev-tools`
  - `features/pjum`
  - `features/reports`
  - `features/storage`

- [ ] **Step 1: Create feature roots**

Run:

```powershell
New-Item -ItemType Directory -Force -Path `
  features/activity, `
  features/admin, `
  features/auth, `
  features/dashboard, `
  features/database-management, `
  features/dev-tools, `
  features/pjum, `
  features/reports, `
  features/storage
```

Expected: directories are created. No imports change yet.

- [ ] **Step 2: Add README files for boundaries**

Create these files:

```text
features/activity/README.md
features/admin/README.md
features/auth/README.md
features/dashboard/README.md
features/database-management/README.md
features/dev-tools/README.md
features/pjum/README.md
features/reports/README.md
features/storage/README.md
```

Each README should state the domain ownership in one or two paragraphs.

- [ ] **Step 3: Verify**

Run:

```powershell
npx tsc --noEmit
```

Expected: pass.

---

### Task 4: Normalize Auth Route Group

**Files:**
- Move: `app/login/page.tsx` to `app/(auth)/login/page.tsx`
- Move: `app/forgot-password/page.tsx` to `app/(auth)/forgot-password/page.tsx`
- Move: `app/change-password/page.tsx` to `app/(auth)/change-password/page.tsx`
- Keep: `app/reset-password/route.ts` unless it is an API-like route with public URL dependency.

- [ ] **Step 1: Move auth pages with route group**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'app/(auth)/login','app/(auth)/forgot-password','app/(auth)/change-password'
git mv app/login/page.tsx 'app/(auth)/login/page.tsx'
git mv app/forgot-password/page.tsx 'app/(auth)/forgot-password/page.tsx'
git mv app/change-password/page.tsx 'app/(auth)/change-password/page.tsx'
```

Expected: URLs remain `/login`, `/forgot-password`, and `/change-password`.

- [ ] **Step 2: Search stale imports or links**

Run:

```powershell
rg -n "app/login|app/forgot-password|app/change-password|/login|/forgot-password|/change-password" app components lib
```

Expected: URL links can remain. File-path imports should not reference old paths.

- [ ] **Step 3: Verify**

Run:

```powershell
npx tsc --noEmit
npx eslint 'app/(auth)' app/layout.tsx
```

Expected: pass.

---

### Task 5: Move Report Shared Types And Helpers

**Files:**
- Move: `types/report.ts` to `features/reports/shared/types.ts`
- Move: `lib/report-utils.ts` to `features/reports/shared/report-utils.ts`
- Move: `lib/report-helpers.ts` to `features/reports/shared/report-helpers.ts`
- Keep compatibility: `types/report.ts`, `lib/report-utils.ts`, `lib/report-helpers.ts`

- [ ] **Step 1: Move files**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'features/reports/shared'
git mv types/report.ts features/reports/shared/types.ts
git mv lib/report-utils.ts features/reports/shared/report-utils.ts
git mv lib/report-helpers.ts features/reports/shared/report-helpers.ts
```

- [ ] **Step 2: Add compatibility re-exports**

Recreate `types/report.ts`:

```ts
export * from "@/features/reports/shared/types";
```

Recreate `lib/report-utils.ts`:

```ts
export * from "@/features/reports/shared/report-utils";
```

Recreate `lib/report-helpers.ts`:

```ts
export * from "@/features/reports/shared/report-helpers";
```

- [ ] **Step 3: Verify**

Run:

```powershell
npx tsc --noEmit
npx tsx lib/realisasi.spec.ts
```

Expected: pass.

---

### Task 6: Move Report Server Actions Out Of `app/`

**Files:**
- Move directory: `app/reports/actions/*` to `features/reports/server/actions/*`
- Keep compatibility: `app/reports/actions/*` as re-export files during transition.
- Modify imports gradually from `@/app/reports/actions/*` to `@/features/reports/server/actions/*`.

- [ ] **Step 1: Create destination**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'features/reports/server/actions'
```

- [ ] **Step 2: Move action modules one by one**

Move in this order:

```powershell
git mv app/reports/actions/types.ts features/reports/server/actions/types.ts
git mv app/reports/actions/report-json-helpers.ts features/reports/server/actions/report-json-helpers.ts
git mv app/reports/actions/queries.ts features/reports/server/actions/queries.ts
git mv app/reports/actions/draft.ts features/reports/server/actions/draft.ts
git mv app/reports/actions/submit.ts features/reports/server/actions/submit.ts
git mv app/reports/actions/resubmit.ts features/reports/server/actions/resubmit.ts
git mv app/reports/actions/approve-estimation.ts features/reports/server/actions/approve-estimation.ts
git mv app/reports/actions/start-work.ts features/reports/server/actions/start-work.ts
git mv app/reports/actions/start-work-with-photos.ts features/reports/server/actions/start-work-with-photos.ts
git mv app/reports/actions/submit-completion.ts features/reports/server/actions/submit-completion.ts
git mv app/reports/actions/submit-completion-work.ts features/reports/server/actions/submit-completion-work.ts
git mv app/reports/actions/review-completion.ts features/reports/server/actions/review-completion.ts
git mv app/reports/actions/approve-final.ts features/reports/server/actions/approve-final.ts
```

- [ ] **Step 3: Recreate compatibility re-exports**

For each moved file under `app/reports/actions/<name>.ts`, add:

```ts
export * from "@/features/reports/server/actions/<name>";
```

Use the matching file basename for `<name>`.

- [ ] **Step 4: Verify**

Run:

```powershell
npx tsc --noEmit
npx eslint app/reports features/reports
```

Expected: pass.

---

### Task 7: Move BMS Create Workflow Into Feature Folder

**Files:**
- Move from: `app/reports/(bms)/create/*`
- Move to: `features/reports/bms/create/*`
- Keep route page at: `app/reports/(bms)/create/page.tsx`
- Keep loading at: `app/reports/(bms)/create/loading.tsx`

- [ ] **Step 1: Move non-route files**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'features/reports/bms/create'
git mv 'app/reports/(bms)/create/components' 'features/reports/bms/create/components'
git mv 'app/reports/(bms)/create/hooks' 'features/reports/bms/create/hooks'
git mv 'app/reports/(bms)/create/create-form.tsx' 'features/reports/bms/create/create-form.tsx'
git mv 'app/reports/(bms)/create/draft-dialog.tsx' 'features/reports/bms/create/draft-dialog.tsx'
git mv 'app/reports/(bms)/create/dev-utils.ts' 'features/reports/bms/create/dev-utils.ts'
```

- [ ] **Step 2: Update route imports**

Modify `app/reports/(bms)/create/page.tsx` to import the form from:

```ts
import { CreateForm } from "@/features/reports/bms/create/create-form";
```

Use the actual exported symbol from the moved file.

- [ ] **Step 3: Update intra-feature imports**

Run:

```powershell
rg -n "@/app/reports/\\(bms\\)/create|\\.\\/components|\\.\\/hooks" features/reports/bms/create app/reports/(bms)/create
```

Fix imports so moved files reference `@/features/reports/bms/create/*` or relative paths inside the feature.

- [ ] **Step 4: Verify**

Run:

```powershell
npx tsc --noEmit
npx eslint 'app/reports/(bms)/create' features/reports/bms/create
```

Expected: pass.

---

### Task 8: Move BMS Start Work Workflow Into Feature Folder

**Files:**
- Move from: `app/reports/(bms)/start-work/*`
- Move to: `features/reports/bms/start-work/*`
- Keep route page/loading in `app/reports/(bms)/start-work`.

- [ ] **Step 1: Move implementation files**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'features/reports/bms/start-work'
git mv 'app/reports/(bms)/start-work/components' 'features/reports/bms/start-work/components'
git mv 'app/reports/(bms)/start-work/hooks' 'features/reports/bms/start-work/hooks'
git mv 'app/reports/(bms)/start-work/actions.ts' 'features/reports/bms/start-work/actions.ts'
git mv 'app/reports/(bms)/start-work/queries.ts' 'features/reports/bms/start-work/queries.ts'
git mv 'app/reports/(bms)/start-work/start-work-form.tsx' 'features/reports/bms/start-work/start-work-form.tsx'
```

- [ ] **Step 2: Update route imports**

Modify `app/reports/(bms)/start-work/page.tsx` so all implementation imports come from:

```ts
@/features/reports/bms/start-work/...
```

- [ ] **Step 3: Verify**

Run:

```powershell
npx tsc --noEmit
npx eslint 'app/reports/(bms)/start-work' features/reports/bms/start-work
```

Expected: pass.

---

### Task 9: Move BMS Complete Workflow Into Feature Folder

**Files:**
- Move from: `app/reports/(bms)/complete/*`
- Move to: `features/reports/bms/complete/*`
- Keep route page/loading in `app/reports/(bms)/complete`.

- [ ] **Step 1: Move implementation files**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'features/reports/bms/complete'
git mv 'app/reports/(bms)/complete/components' 'features/reports/bms/complete/components'
git mv 'app/reports/(bms)/complete/hooks' 'features/reports/bms/complete/hooks'
git mv 'app/reports/(bms)/complete/actions.ts' 'features/reports/bms/complete/actions.ts'
git mv 'app/reports/(bms)/complete/queries.ts' 'features/reports/bms/complete/queries.ts'
git mv 'app/reports/(bms)/complete/types.ts' 'features/reports/bms/complete/types.ts'
git mv 'app/reports/(bms)/complete/complete-form.tsx' 'features/reports/bms/complete/complete-form.tsx'
```

- [ ] **Step 2: Update route imports**

Modify `app/reports/(bms)/complete/page.tsx` so all implementation imports come from:

```ts
@/features/reports/bms/complete/...
```

- [ ] **Step 3: Verify BMS completion behavior compiles**

Run:

```powershell
npx tsc --noEmit
npx eslint 'app/reports/(bms)/complete' features/reports/bms/complete
```

Expected: pass.

---

### Task 10: Move Report Detail And Report Lists Into Feature Folder

**Files:**
- Move: `app/reports/[reportNumber]/_components/*` to `features/reports/detail/components/*`
- Move: `app/reports/[reportNumber]/report-detail-view.tsx` to `features/reports/detail/report-detail-view.tsx`
- Move: `app/reports/_components/*` to `features/reports/list/components/*`
- Keep route pages in `app/reports`.

- [ ] **Step 1: Move detail components**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'features/reports/detail/components'
git mv 'app/reports/[reportNumber]/_components' 'features/reports/detail/components'
git mv 'app/reports/[reportNumber]/report-detail-view.tsx' 'features/reports/detail/report-detail-view.tsx'
```

- [ ] **Step 2: Move list components**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'features/reports/list'
git mv app/reports/_components 'features/reports/list/components'
```

- [ ] **Step 3: Update route imports**

Modify:

```text
app/reports/page.tsx
app/reports/[reportNumber]/page.tsx
```

Use imports from:

```ts
@/features/reports/list/components/...
@/features/reports/detail/...
```

- [ ] **Step 4: Verify**

Run:

```powershell
npx tsc --noEmit
npx eslint app/reports features/reports
```

Expected: pass.

---

### Task 11: Move PJUM Into Its Own Feature

**Files:**
- Move: `app/reports/pjum/actions.ts` to `features/pjum/server/actions.ts`
- Move: `app/reports/pjum/approval-actions.ts` to `features/pjum/server/approval-actions.ts`
- Move: `app/reports/pjum/_components/*` to `features/pjum/components/*`
- Keep route pages in `app/reports/pjum`.

- [ ] **Step 1: Move PJUM implementation**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'features/pjum/server','features/pjum/components'
git mv app/reports/pjum/actions.ts features/pjum/server/actions.ts
git mv app/reports/pjum/approval-actions.ts features/pjum/server/approval-actions.ts
git mv app/reports/pjum/_components features/pjum/components
```

- [ ] **Step 2: Update PJUM route imports**

Modify:

```text
app/reports/pjum/page.tsx
app/reports/pjum/[id]/page.tsx
```

Use imports from:

```ts
@/features/pjum/server/actions
@/features/pjum/server/approval-actions
@/features/pjum/components/...
```

- [ ] **Step 3: Verify PJUM**

Run:

```powershell
npx tsc --noEmit
npx eslint app/reports/pjum features/pjum
```

Expected: pass.

---

### Task 12: Consolidate Admin And BMC Database Management

**Files:**
- Compare:
  - `app/admin/database/actions.ts`
  - `app/bmc/database/actions.ts`
  - `app/admin/database/_components/*`
  - `app/bmc/database/_components/*`
- Create:
  - `features/database-management/server/actions.ts`
  - `features/database-management/server/queries.ts`
  - `features/database-management/components/*`
- Keep:
  - `app/admin/database/page.tsx`
  - `app/bmc/database/page.tsx`

- [ ] **Step 1: Extract shared components**

Move duplicated components to:

```text
features/database-management/components/user-table.tsx
features/database-management/components/user-form-dialog.tsx
features/database-management/components/store-table.tsx
features/database-management/components/store-form-dialog.tsx
features/database-management/components/import-user-dialog.tsx
features/database-management/components/import-store-dialog.tsx
features/database-management/components/delete-dialog.tsx
```

- [ ] **Step 2: Extract role policy**

Create `features/database-management/server/role-policy.ts` with:

```ts
export type DatabaseManagementRole = "ADMIN" | "BMC";

export function canManageAllBranches(role: DatabaseManagementRole) {
    return role === "ADMIN";
}
```

Extend this only with behavior already present in the two existing action files.

- [ ] **Step 3: Merge actions behind role checks**

Create `features/database-management/server/actions.ts` from the shared behavior in:

```text
app/admin/database/actions.ts
app/bmc/database/actions.ts
```

Preserve existing authorization differences by calling `requireRole("ADMIN")` or `requireRole("BMC")` in wrapper functions.

- [ ] **Step 4: Update route pages**

Modify:

```text
app/admin/database/page.tsx
app/bmc/database/page.tsx
```

Import shared components and actions from `features/database-management`.

- [ ] **Step 5: Verify**

Run:

```powershell
npx tsc --noEmit
npx eslint app/admin/database app/bmc/database features/database-management
```

Expected: pass.

---

### Task 13: Move Dashboard Components And Queries

**Files:**
- Move: `app/dashboard/_components/*` to `features/dashboard/components/*`
- Move: `app/dashboard/queries.ts` to `features/dashboard/server/queries.ts`
- Keep: `app/dashboard/page.tsx`

- [ ] **Step 1: Move dashboard files**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'features/dashboard/components','features/dashboard/server'
git mv app/dashboard/_components features/dashboard/components
git mv app/dashboard/queries.ts features/dashboard/server/queries.ts
```

- [ ] **Step 2: Update imports**

Modify `app/dashboard/page.tsx` and moved dashboard components to use:

```ts
@/features/dashboard/components/...
@/features/dashboard/server/queries
```

- [ ] **Step 3: Verify**

Run:

```powershell
npx tsc --noEmit
npx eslint app/dashboard features/dashboard
```

Expected: pass.

---

### Task 14: Make API Route Handlers Thin

**Files:**
- Keep route files under `app/api/**/route.ts`
- Move implementation into matching feature handlers:
  - `app/api/dev/drive-proxy/route.ts` to `features/dev-tools/server/drive-proxy-handler.ts`
  - `app/api/dev/revise-pjum/route.ts` internals to `features/dev-tools/server/revise-pjum-handler.ts`
  - `app/api/reports/[reportNumber]/pdf/route.ts` internals to `features/reports/server/handlers/report-pdf-handler.ts`
  - `app/api/reports/pjum-pdf/route.ts` internals to `features/pjum/server/handlers/pjum-pdf-handler.ts`
  - `app/api/photos/*` internals to `features/storage/server/handlers/*`

- [ ] **Step 1: Move dev route helpers**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'features/dev-tools/server'
```

Move helper files from `app/api/dev/*` into `features/dev-tools/server/*`, keeping each `route.ts` as a small delegation wrapper.

- [ ] **Step 2: Move report/PJUM PDF handlers**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'features/reports/server/handlers','features/pjum/server/handlers'
```

Route files should look like:

```ts
export { GET } from "@/features/reports/server/handlers/report-pdf-handler";
```

Use the appropriate feature handler path for each route.

- [ ] **Step 3: Move photo/storage handlers**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'features/storage/server/handlers'
```

Move internals from:

```text
app/api/photos/[fileId]/route.ts
app/api/photos/upload/route.ts
app/api/photos/test-url/route.ts
app/api/photos/debug-env/route.ts
```

into `features/storage/server/handlers/*`.

- [ ] **Step 4: Verify**

Run:

```powershell
npx tsc --noEmit
npx eslint app/api features/dev-tools features/reports features/pjum features/storage
```

Expected: pass.

---

### Task 15: Split PDF Generation Into Modules

**Files:**
- Split: `lib/pdf/generate-report-pdf.ts`
- Split: `lib/pdf/generate-revision-pdf.ts`
- Split: `lib/pdf/generate-pjum-form-pdf.ts`
- Split: `lib/pdf/generate-pjum-pdf.ts`

- [ ] **Step 1: Create PDF section folders**

Run:

```powershell
New-Item -ItemType Directory -Force -Path `
  'lib/pdf/report', `
  'lib/pdf/revision', `
  'lib/pdf/pjum'
```

- [ ] **Step 2: Extract report PDF sections**

From `lib/pdf/generate-report-pdf.ts`, extract stable pure helpers and sections into:

```text
lib/pdf/report/formatters.ts
lib/pdf/report/styles.ts
lib/pdf/report/sections/header.ts
lib/pdf/report/sections/checklist.ts
lib/pdf/report/sections/estimation.ts
lib/pdf/report/sections/completion.ts
lib/pdf/report/sections/realisasi.ts
```

Keep `lib/pdf/generate-report-pdf.ts` as the public entry point exporting the same API.

- [ ] **Step 3: Extract PJUM PDF sections**

From `lib/pdf/generate-pjum-form-pdf.ts` and `lib/pdf/generate-pjum-pdf.ts`, extract:

```text
lib/pdf/pjum/formatters.ts
lib/pdf/pjum/styles.ts
lib/pdf/pjum/form-document.ts
lib/pdf/pjum/recap-document.ts
```

Keep original public entry files as wrappers.

- [ ] **Step 4: Verify PDF callers**

Run:

```powershell
rg -n "generateReportPdf|generateRevisionPdf|generatePjumPdf|generatePjumFormPdf|generatePjumPackagePdf" app features lib scripts
npx tsc --noEmit
```

Expected: imports still resolve and public APIs remain stable.

---

### Task 16: Clean Shared Hooks And Photo Storage

**Files:**
- Move: `lib/hooks/use-photo-upload.ts` to `hooks/use-photo-upload.ts`
- Move: `lib/hooks/use-history-back-close.ts` to `hooks/use-history-back-close.ts`
- Move: `lib/hooks/use-debounce.ts` to `hooks/use-debounce.ts`
- Keep compatibility re-exports in `lib/hooks/*` during transition.
- Consider moving storage photo URL helpers into `features/storage/shared`.

- [ ] **Step 1: Move global hooks**

Run:

```powershell
git mv lib/hooks/use-photo-upload.ts hooks/use-photo-upload.ts
git mv lib/hooks/use-history-back-close.ts hooks/use-history-back-close.ts
git mv lib/hooks/use-debounce.ts hooks/use-debounce.ts
```

- [ ] **Step 2: Add compatibility re-exports**

Recreate each moved file under `lib/hooks` with:

```ts
export * from "@/hooks/<hook-file>";
```

- [ ] **Step 3: Update imports gradually**

Run:

```powershell
rg -n "@/lib/hooks" app components features hooks lib
```

Replace with `@/hooks/...` unless the hook becomes domain-specific.

- [ ] **Step 4: Verify**

Run:

```powershell
npx tsc --noEmit
npx eslint hooks lib/hooks app features
```

Expected: pass.

---

### Task 17: Remove Compatibility Re-Exports

**Files:**
- Remove temporary re-export files created in earlier tasks after all imports are updated.

- [ ] **Step 1: Search old paths**

Run:

```powershell
rg -n "@/types/report|@/lib/report-utils|@/lib/report-helpers|@/app/reports/actions|@/lib/hooks" app components features lib hooks types
```

Expected: no imports remain except compatibility files themselves.

- [ ] **Step 2: Delete compatibility files**

Delete only compatibility files whose imports are fully migrated.

- [ ] **Step 3: Verify full project**

Run:

```powershell
npx tsc --noEmit
npx eslint app components features hooks lib types
npm run build
```

Expected: pass.

---

## Manual QA Checklist

- Login still works at `/login`.
- BMS create report still works.
- BMS start work still works.
- BMS complete work still works.
- Report detail page still loads at `/reports/[reportNumber]`.
- BMC approval lists still load.
- BMC PJUM creation still works, including overlapping date/report-level lock behavior.
- BNM PJUM approval still works.
- Admin dashboard and CRUD pages still load.
- Photo preview and upload routes still work.
- PDF preview and PDF regeneration routes still work.
- Dev-only routes remain inaccessible outside allowed dev conditions.

## Rollout Strategy

- Execute one task group at a time.
- Commit after each successful task or domain migration.
- If a domain migration gets noisy, pause and add a temporary compatibility wrapper instead of pushing through a risky bulk edit.
- Defer the `src/` directory decision until after this refactor is stable.

## Open Decisions

- Whether route groups should be named `(main)` and `(auth)`, or whether only `(auth)` is worth adding now.
- Whether PDF modules should stay in `lib/pdf` or move under `features/reports/pdf` and `features/pjum/pdf` later.
- Whether to add a formal test runner script for the existing `*.spec.ts` assertion files.

## Completion Criteria

- `app/` contains route entry points and minimal route-local components only.
- Feature implementation lives under `features/*`.
- No public route URL changes.
- `npx tsc --noEmit` passes.
- `npx eslint app components features hooks lib types` passes.
- `npm run build` passes.
- Manual QA checklist is completed.
