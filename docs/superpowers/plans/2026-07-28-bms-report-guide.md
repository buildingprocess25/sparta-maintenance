# BMS Report Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive BMS guide to the current create and revision wizard.

**Architecture:** A pure module defines the valid guide steps. `BmsReportTour` observes the existing wizard step and opens one Joyride tooltip only after that target renders. The BMC/BNM tooltip is extracted for exact visual reuse; BMS alone leaves its form controls interactive.

**Tech Stack:** Next.js, React, TypeScript, `react-joyride`, `tsx`, Node `assert/strict`.

## Global Constraints

- Do not add dependencies, database changes, server actions, or migrations.
- Do not mutate BMS form data or call wizard navigation/submit handlers from the guide.
- Create flow: store, checklist, estimation, review. Revision flow: checklist, estimation, review.
- Preserve BMC/BNM approval-tour behavior; BMS uses `blockTargetInteraction: false`.
- Add one dated Asia/Jakarta task note before the final implementation commit.

---

### Task 1: Define guide data with a runnable check

**Files:**
- Create: `app/reports/(bms)/create/components/bms-report-tour-steps.ts`
- Create: `app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts`

- [ ] Write the RED assertion:

```ts
assert.deepEqual(getBmsReportTourSteps(false).map((x) => x.wizardStep), ["store", "checklist", "estimation", "review"]);
assert.deepEqual(getBmsReportTourSteps(true).map((x) => x.wizardStep), ["checklist", "estimation", "review"]);
```

- [ ] Run `npx tsx "app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts"`; expect module-not-found failure.
- [ ] Implement exported `BmsWizardStep`, `BmsReportTourStep`, and `getBmsReportTourSteps(isEditMode)`. Definitions use these exact targets: `bms-report-store`, `bms-report-checklist`, `bms-report-estimation`, `bms-report-submit`.
- [ ] Re-run the assertion; expect exit `0`.
- [ ] Commit: `test(bms): define report tour steps`.

### Task 2: Share existing tooltip UI

**Files:**
- Create: `components/reports/report-tour-tooltip.tsx`
- Modify: `app/dashboard/reports/[reportNumber]/_components/approval-review-tour.tsx`

- [ ] Move `ApprovalTourTooltip` markup, keyboard checkbox interaction, Button variants, icons, and aria labels into `ReportTourTooltip`.
- [ ] Make the checkbox data attribute a prop so approval continues passing `data-approval-tour-hide-today` and BMS can pass `data-bms-report-tour-hide-today`.
- [ ] Replace only the approval-tour local tooltip with the shared import; retain its storage key, selectors, and blocking interaction.
- [ ] Run `npx eslint components/reports/report-tour-tooltip.tsx "app/dashboard/reports/[reportNumber]/_components/approval-review-tour.tsx"`; expect exit `0`.
- [ ] Commit: `refactor: share report tour tooltip`.

### Task 3: Implement BMS active-step tour

**Files:**
- Create: `app/reports/(bms)/create/components/bms-report-tour.tsx`
- Modify: `app/reports/(bms)/create/create-form.tsx`

- [ ] `BmsReportTour` receives `{ activeStep: BmsWizardStep; isEditMode: boolean }`, derives the matching step, and waits up to 50 × 100 ms for its selector.
- [ ] Reuse Jakarta date key, bounded target wait, body-scroll cleanup, overlay color, z-index, and shared tooltip from `ApprovalReviewTour`.
- [ ] Use localStorage key `bms-report-tour:v1:create` or `bms-report-tour:v1:revision`. Only the checkbox saves the daily key. `STATUS.SKIPPED` suppresses remaining steps for the current page visit; `STATUS.FINISHED` closes only the current tooltip.
- [ ] Set `blockTargetInteraction: false`; do not call `setStep`, `handleNext`, `handleBack`, or `handleSubmit`.
- [ ] Mount `<BmsReportTour activeStep={step} isEditMode={isEditMode} />` beside the existing `ReportWizardShell`.
- [ ] Run focused ESLint plus the Task 1 assertion; expect exit `0`.
- [ ] Commit: `feat(bms): guide report creation`.

### Task 4: Expose targets and verify flows

**Files:**
- Modify: `app/reports/(bms)/create/components/store-step.tsx`
- Modify: `app/reports/(bms)/create/components/checklist-step.tsx`
- Modify: `app/reports/(bms)/create/components/bms-estimation-step.tsx`
- Modify: `app/reports/(bms)/create/create-form.tsx`
- Create: `docs/agent-notes/<Asia-Jakarta timestamp>-bms-report-guide.md`

- [ ] Add only the four stable `data-tour` attributes defined in Task 1; use existing containers and do not change layout spacing.
- [ ] In mobile viewport, verify a new report shows guide steps only after normal progression: store → checklist → estimation → review. All target controls remain usable.
- [ ] Verify a revision begins at checklist and never shows the store guide. Verify Skip ends the current-session guide and the checkbox suppresses the matching form mode until the next Jakarta date.
- [ ] Run: Task 1 assertion, focused ESLint for all touched tour/BMS files, `npm run build`, and `git diff --check`; each must exit `0`.
- [ ] Create the required task note with selectors, shared-tooltip decision, commands, and manual outcomes; commit: `feat(bms): complete report guide`.

## Plan Self-Review

- Every approved requirement maps to a task: create/revision scope, daily dismissal, BMC/BNM preservation, BMS interaction, validation safety, and no database work.
- The plan introduces one reusable tooltip rather than duplicating UI and has one executable assertion for branching logic.
