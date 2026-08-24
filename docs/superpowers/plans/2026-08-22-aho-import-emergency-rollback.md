# AHO Import Emergency Rollback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the production AHO import entry points to the known baseline at `b45b5a6792e6bb85e047ba583f39ab227164f247` without reversing the applied `AhoImportJob` migration.

**Architecture:** Restore only the Server Action and import dialog used by the dashboard. Retain the additive Prisma model and migration so the deployed database remains compatible and migration history stays intact.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma, PostgreSQL.

## Global Constraints

- Do not modify or remove `prisma/migrations/20260821081344_add_aho_import_job/migration.sql`.
- Do not remove `AhoImportJob` or `AhoImportStatus` from `prisma/schema.prisma`.
- Do not use `git reset`, force-push, or bypass the task-note hook.
- Restore only the two runtime entry-point files from the confirmed baseline.

---

### Task 1: Restore the known-good import entry points

**Files:**
- Modify: `app/dashboard/aho-tickets/actions.ts`
- Modify: `app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx`
- Create: `docs/agent-notes/2026-08-22-0933-rollback-aho-import.md`

**Interfaces:**
- Consumes: baseline Git tree `b45b5a6792e6bb85e047ba583f39ab227164f247`
- Produces: synchronous `adminImportAhoTickets(formData)` flow and its matching dialog UI

- [x] **Step 1: Verify the current files differ from the baseline**

Run `git diff --exit-code b45b5a6792e6bb85e047ba583f39ab227164f247 -- app/dashboard/aho-tickets/actions.ts app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx` and expect a non-zero exit code.

- [x] **Step 2: Restore both files from the baseline**

Run `git restore --source=b45b5a6792e6bb85e047ba583f39ab227164f247 -- app/dashboard/aho-tickets/actions.ts app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx`.

- [x] **Step 3: Verify exact baseline equality**

Run the Step 1 command again and expect exit code 0 with no output.

- [x] **Step 4: Verify production build and staged scope**

Run `npm run build`, `git diff --check`, and inspect `git diff --cached` before committing.

- [ ] **Step 5: Commit and push the hotfix**

Commit with `revert(aho-import): restore synchronous flow`, then push the hotfix branch for deployment through `main`.
