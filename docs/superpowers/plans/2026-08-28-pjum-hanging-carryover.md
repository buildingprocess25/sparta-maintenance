# PJUM Hanging Carryover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry omitted completed reports into exactly one following PJUM and BMS balance period, then settle or permanently expire them.

**Architecture:** Extend `Report` with two lifecycle timestamps and centralize the approval transition in `lib/balance.ts`. Existing period ownership drives balance calculation; PJUM search adds active carryovers independently of the selected date range. UI consumers receive an explicit balance breakdown and expiry warning.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7/PostgreSQL, Node test runner through `tsx`.

## Global Constraints

- No Regional approval or unlock-request flow.
- Old PJUM date ranges remain blocked.
- Carryover lasts exactly until approval of the next PJUM.
- Available BMS balance may be negative.
- Follow test-first red-green-refactor for behavior changes.

---

### Task 1: Hanging lifecycle schema and transition

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260828141000_add_pjum_hanging_lifecycle/migration.sql`
- Create: `lib/pjum-hanging.ts`
- Test: `lib/pjum-hanging.spec.ts`
- Modify: `lib/balance.ts`

**Interfaces:**
- Produces: `classifyPjumApprovalReports(reports, approvedReportNumbers, fromDate, toDate)` returning `expireReportNumbers` and `carryReportNumbers`.
- Produces: `resetBmsBalanceAfterPjumApproval(bmsNIK, pjumExport)` performing the close/create/carry/expire transaction.

- [ ] Write a failing unit test covering new carryover, existing carryover expiry, selected carryover settlement, and reports outside the approved date range.
- [ ] Run `npx tsx --test lib/pjum-hanging.spec.ts` and confirm failure because the classifier is missing.
- [ ] Add the pure classifier and rerun the test to green.
- [ ] Add `pjumHangingAt` and `pjumExpiredAt`, their index, and the matching SQL migration.
- [ ] Update the balance reset transaction to expire old carryovers and move newly omitted reports into the new period.
- [ ] Generate Prisma Client and run the focused test again.

### Task 2: PJUM candidates without Regional unlock

**Files:**
- Modify: `app/dashboard/pjum/actions.ts`
- Test: `app/dashboard/pjum/hanging-candidates.spec.ts`
- Modify: `app/dashboard/pjum/_components/create-pjum-dialog.tsx`

**Interfaces:**
- Consumes: active hanging lifecycle fields from Task 1.
- Produces: candidate rows with `isHangingReport` and no unlock status.

- [ ] Write a failing test proving active carryovers are eligible outside the selected range and expired reports are excluded.
- [ ] Run the focused test and verify the expected failure.
- [ ] Replace the unfinished `unlockRequests` flow with active-period carryover selection and hard server validation for expiry.
- [ ] Remove unlock copy and show the one-PJUM deadline on hanging candidate rows.
- [ ] Run candidate tests to green.

### Task 3: BNM expiry confirmation and approval integration

**Files:**
- Modify: `app/reports/pjum/approval-actions.ts`
- Modify: `app/dashboard/pjum/[id]/page.tsx`
- Modify: `app/dashboard/pjum/[id]/_components/pjum-approval-button.tsx`
- Test: `app/dashboard/pjum/pjum-expiry-warning.spec.ts`

**Interfaces:**
- Consumes: transition function from Task 1.
- Produces: `omittedHangingReports` summary and explicit approval confirmation.

- [ ] Write a failing test for omitted carryover count, total, and permanent-expiry copy.
- [ ] Run the focused test and verify the expected failure.
- [ ] Pass the full PJUM period into the reset transition and expose omitted active carryovers on the approval detail.
- [ ] Require a confirmation dialog when approval will expire carryovers; keep approval allowed.
- [ ] Run approval warning tests to green.

### Task 4: BMS/BMC balance explanation

**Files:**
- Modify: `lib/balance.ts`
- Modify: `components/bms-balance-card.tsx`
- Modify: `app/dashboard/_components/bms-welcome-card.tsx`
- Modify: `app/dashboard/_components/balance-history-drawer.tsx`
- Test: `lib/pjum-hanging-balance.spec.ts`

**Interfaces:**
- Produces: balance fields `hangingDeduction`, `currentPeriodUsed`, and `hangingReports` while preserving `usedBalance` and `availableBalance` compatibility.

- [ ] Write a failing test proving Rp300,000 carryover yields Rp700,000 opening availability and Rp1,200,000 yields -Rp200,000.
- [ ] Run the focused test and verify the expected failure.
- [ ] Split carryover deduction from current-period usage in balance calculation and history data.
- [ ] Render the permanent breakdown and hanging report list for BMS; reuse the same summary in BMC PJUM context.
- [ ] Run focused tests to green.

### Task 5: Documentation and verification

**Files:**
- Modify: `docs/project/04-workflows.md`
- Modify: `docs/project/06-database.md`
- Modify: `docs/project/10-bms-weekly-balance.md`
- Create: `docs/agent-notes/2026-08-28-1402-pjum-hanging-carryover.md`

- [ ] Replace the obsolete Regional approval design with the final one-cycle carryover rules.
- [x] Record schema fields, UI communication, negative balance, and expiry behavior in canonical docs.
- [x] Run all focused tests, `npx tsc --noEmit`, and `npm run lint --` for changed source files.
- [x] Run `npm run check:agent-note` and review `git diff --check` plus the final diff.
