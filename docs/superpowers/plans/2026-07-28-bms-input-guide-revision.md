# BMS Input Guide Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace broad BMS wizard tips with actionable, conditional checklist and estimation guides.

**Architecture:** One `BmsReportTour` renders one contextual Joyride step at a time. A pure definition module supplies the ordered targets; its runtime waits for the next DOM target rather than changing report state. Existing dialogs, validation, and server actions remain unchanged.

**Tech Stack:** Next.js App Router, React 19, TypeScript, `react-joyride`, shadcn/ui, `tsx` assertion scripts.

## Global Constraints

- Remove store-selection and review/submit steps.
- Do not change report data, validation, dialogs, or server contracts.
- Keep `blockTargetInteraction: false`.
- Repair-only mode omits condition; hidden targets end the current guide cleanly.
- Keep Jakarta-date dismissal and separate create/revision keys.
- Create a dated `docs/agent-notes/` file before each commit.

---

## File Structure

- `app/reports/(bms)/create/components/bms-report-tour-steps.ts`: step IDs, selectors, copy, and context-based flow.
- `app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts`: flow-order assertions.
- `app/reports/(bms)/create/components/bms-report-tour.tsx`: one-step lifecycle and bounded target wait.
- `app/reports/(bms)/create/components/checklist-step.tsx`: field targets.
- `app/reports/(bms)/create/components/bms-estimation-step.tsx`: estimation and action-menu targets.
- `app/reports/(bms)/create/create-form.tsx`: repair-only prop and existing draft-dialog guard.
- `app/reports/(bms)/create/components/bms-input-tour-targets.spec.ts`: target-presence assertion.
- `app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts`: runtime source contract assertion.

### Task 1: Define actionable flows

**Files:**
- Modify: `app/reports/(bms)/create/components/bms-report-tour-steps.ts`
- Modify: `app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts`

**Interfaces:**
- Produces `BmsInputTourStep`, a Joyride `Step` with `id`, `target`, and `wizardStep`.
- Produces `getBmsInputTourSteps({ activeStep, isRepairOnlyMode })`.

- [ ] **Step 1: Write the failing flow test**

```ts
assert.deepEqual(
    getBmsInputTourSteps({ activeStep: "checklist", isRepairOnlyMode: false })
        .map((step) => step.id),
    ["condition", "handler", "photo", "notes", "aho"],
);
assert.deepEqual(
    getBmsInputTourSteps({ activeStep: "checklist", isRepairOnlyMode: true })
        .map((step) => step.id),
    ["handler", "photo", "notes", "aho"],
);
assert.deepEqual(
    getBmsInputTourSteps({ activeStep: "estimation", isRepairOnlyMode: false })
        .map((step) => step.id),
    ["add-item", "estimate-item", "estimate-name", "estimate-quantity", "estimate-price", "estimate-save", "estimate-actions", "estimate-edit", "estimate-delete"],
);
```

- [ ] **Step 2: Run RED**

```powershell
npx tsx 'app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts'
```

Expected: FAIL because the current API defines store/checklist/estimation/review only.

- [ ] **Step 3: Implement the pure step module**

```ts
export type BmsInputTourId =
    | "condition" | "handler" | "photo" | "notes" | "aho"
    | "add-item" | "estimate-item" | "estimate-name"
    | "estimate-quantity" | "estimate-price" | "estimate-save"
    | "estimate-actions" | "estimate-edit" | "estimate-delete";

export type BmsInputTourStep = Step & {
    id: BmsInputTourId;
    wizardStep: "checklist" | "estimation";
};

export function getBmsInputTourSteps({ activeStep, isRepairOnlyMode }: {
    activeStep: "store" | "checklist" | "estimation" | "review";
    isRepairOnlyMode: boolean;
}): BmsInputTourStep[] {
    // Return [] for store/review, five or four checklist steps, or nine estimation steps.
}
```

Use these exact selector names: `bms-checklist-condition`, `bms-checklist-handler`, `bms-checklist-photo`, `bms-checklist-notes`, `bms-checklist-aho`, `bms-estimation-add`, `bms-estimation-item`, `bms-estimation-name`, `bms-estimation-quantity`, `bms-estimation-price`, `bms-estimation-save`, `bms-estimation-actions`, `bms-estimation-edit`, and `bms-estimation-delete`. Copy must explain BMS/Rekanan and that price `Rp 0` is valid.

- [ ] **Step 4: Run GREEN**

Run the Step 2 command. Expected: `bms-report-tour-steps spec tests passed`.

- [ ] **Step 5: Commit Task 1**

```powershell
git add 'app/reports/(bms)/create/components/bms-report-tour-steps.ts' 'app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts' docs/agent-notes/2026-07-28-1410-define-bms-input-guides.md
git commit -m "refactor: define BMS input guides"
```

### Task 2: Add targets to actual fields and actions

**Files:**
- Modify: `app/reports/(bms)/create/components/checklist-step.tsx`
- Modify: `app/reports/(bms)/create/components/bms-estimation-step.tsx`
- Create: `app/reports/(bms)/create/components/bms-input-tour-targets.spec.ts`

**Interfaces:**
- Consumes all selector names from Task 1.
- Produces only existing DOM controls with matching `data-tour` attributes.

- [ ] **Step 1: Write the failing target test**

```ts
const targets = [
    "bms-checklist-condition", "bms-checklist-handler", "bms-checklist-photo",
    "bms-checklist-notes", "bms-checklist-aho", "bms-estimation-add",
    "bms-estimation-item", "bms-estimation-name", "bms-estimation-quantity",
    "bms-estimation-price", "bms-estimation-save", "bms-estimation-actions",
    "bms-estimation-edit", "bms-estimation-delete",
];
for (const target of targets) assert.match(source, new RegExp(`data-tour=["']${target}["']`));
```

- [ ] **Step 2: Run RED**

```powershell
npx tsx 'app/reports/(bms)/create/components/bms-input-tour-targets.spec.ts'
```

Expected: FAIL because only broad checklist/estimation targets exist.

- [ ] **Step 3: Attach stable attributes**

Attach checklist attributes to its condition radio wrapper, Rusak-only handler wrapper, photo wrapper, notes wrapper, and AHO wrapper. Keep Rusak-only attributes inside the existing conditional branch.

Attach estimation attributes to Add Barang, item Select trigger, item name input, quantity-and-unit wrapper, price input wrapper, Simpan Item, three-dot trigger, Edit, and Hapus. Keep Edit/Hapus inside `DropdownMenuContent` so they appear only after the user opens the menu.

- [ ] **Step 4: Run GREEN**

Run the Step 2 command. Expected: `bms input tour target assertions passed`.

- [ ] **Step 5: Commit Task 2**

```powershell
git add 'app/reports/(bms)/create/components/checklist-step.tsx' 'app/reports/(bms)/create/components/bms-estimation-step.tsx' 'app/reports/(bms)/create/components/bms-input-tour-targets.spec.ts' docs/agent-notes/2026-07-28-1420-expose-bms-guide-targets.md
git commit -m "feat: expose BMS guide targets"
```

### Task 3: Make Joyride conditional and target-aware

**Files:**
- Modify: `app/reports/(bms)/create/components/bms-report-tour.tsx`
- Modify: `app/reports/(bms)/create/create-form.tsx`
- Create: `app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts`

**Interfaces:**
- Consumes `getBmsInputTourSteps({ activeStep, isRepairOnlyMode })`.
- `BmsReportTour` receives `activeStep`, `isEditMode`, and `isRepairOnlyMode`.

- [ ] **Step 1: Write the failing runtime test**

```ts
assert.match(tourSource, /steps=\{currentStep \? \[currentStep\] : \[\]\}/);
assert.match(tourSource, /getBmsInputTourSteps\(\{\s*activeStep,\s*isRepairOnlyMode/);
assert.match(formSource, /isRepairOnlyMode=\{isRepairOnlyMode\}/);
assert.doesNotMatch(stepsSource, /wizardStep:\s*"store"/);
assert.doesNotMatch(stepsSource, /wizardStep:\s*"review"/);
```

- [ ] **Step 2: Run RED**

```powershell
npx tsx 'app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts'
```

Expected: FAIL because the current component uses the old broad-step API.

- [ ] **Step 3: Implement single-step lifecycle**

```ts
if (data.type === EVENTS.STEP_AFTER && data.action === ACTIONS.NEXT) {
    setRun(false);
    setStepIndex((index) => index + 1);
    return;
}
if (data.status === STATUS.SKIPPED || data.status === STATUS.FINISHED) {
    dismissedThisSession.current = true;
    persistDailyDismissalIfChecked();
    setRun(false);
}
```

Derive `currentStep` from the Task 1 flow and render `steps={currentStep ? [currentStep] : []}`. After every Next, poll the next selector every 100 ms for at most 50 attempts; restart only when `document.querySelector(nextStep.target)` exists. If it does not appear, stop the current flow and restore body overflow. This covers non-Rusak checklist entries and dialogs/menus closed before their next target appears. Preserve `blockTargetInteraction: false`, the tooltip component, daily dismissal checkbox, separate create/revision keys, and the existing draft-dialog suppression. Pass `isRepairOnlyMode` from `CreateReportForm`.

- [ ] **Step 4: Run GREEN**

```powershell
npx tsx 'app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts'
npx tsx 'app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts'
npx tsx 'app/reports/(bms)/create/components/bms-input-tour-targets.spec.ts'
```

Expected: all three commands exit 0.

- [ ] **Step 5: Commit Task 3**

```powershell
git add 'app/reports/(bms)/create/components/bms-report-tour.tsx' 'app/reports/(bms)/create/create-form.tsx' 'app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts' docs/agent-notes/2026-07-28-1430-run-bms-input-guide.md
git commit -m "feat: guide BMS report input"
```

### Task 4: Verify complete behavior

**Files:**
- Create: `docs/agent-notes/2026-07-28-1440-verify-bms-input-guide.md`

- [ ] **Step 1: Run automated verification**

```powershell
npx eslint 'app/reports/(bms)/create/components/bms-report-tour-steps.ts' 'app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts' 'app/reports/(bms)/create/components/bms-input-tour-targets.spec.ts' 'app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts' 'app/reports/(bms)/create/components/bms-report-tour.tsx' 'app/reports/(bms)/create/components/checklist-step.tsx' 'app/reports/(bms)/create/components/bms-estimation-step.tsx' 'app/reports/(bms)/create/create-form.tsx'
npx tsc --noEmit
npm run test:agent-note
git diff --check
```

Expected: each command exits 0.

- [ ] **Step 2: Run browser checks**

1. Open a new BMS report after resolving any draft dialog; confirm no store guide.
2. Confirm normal checklist starts at Kondisi; choose Rusak and see Handler, Foto, Catatan, AHO in order.
3. Confirm repair-only checklist starts at Handler, with no Kondisi target.
4. Add a BMS estimation item and confirm add button, five dialog inputs, and save guidance.
5. Save an item, open three-dot menu, and confirm menu, Edit, Hapus targets.
6. Close the add dialog/menu mid-flow; confirm no overlay remains and the fixed footer is clickable.
7. Confirm the draft dialog remains clickable before any guide appears.

- [ ] **Step 3: Record and commit Task 4**

```powershell
git add docs/agent-notes/2026-07-28-1440-verify-bms-input-guide.md
git commit -m "test: verify BMS input guide"
```

## Plan Self-Review

- **Spec coverage:** Tasks 1-3 cover removed broad steps, all checklist and estimation targets, repair-only mode, conditional waiting, dismissal, and draft-dialog precedence. Task 4 covers automated and browser validation.
- **Placeholder scan:** No unresolved behavior, selector, command, or task-note path remains.
- **Type consistency:** `BmsInputTourStep`, `getBmsInputTourSteps`, `isRepairOnlyMode`, and all `data-tour` values use identical names in every task.
