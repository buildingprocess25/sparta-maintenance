# Contextual Checklist Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make submit guidance, activity labels, filters, report histories, and notifications describe checklist-only reports as checklist review while preserving estimation wording for reports that contain at least one BMS-handled item.

**Architecture:** Keep the existing Prisma enums, migrations, report transitions, and stored `ActivityAction` values unchanged. Derive one contextual `isChecklistOnly` flag from report items (`handler !== "BMS"` for every item), keep that derivation server-side for query results and notifications, and route all display labels through shared pure helpers so every UI surface uses the same terminology.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/PostgreSQL, Node `assert` tests executed with `tsx`, ESLint.

## Global Constraints

- Do not edit `prisma/schema.prisma` or create a Prisma migration.
- Do not rename or backfill `ActivityAction.ESTIMATION_APPROVED`, `ESTIMATION_REJECTED_REVISION`, or `ESTIMATION_REJECTED`.
- Treat a report as checklist-only when no persisted item has `handler === "BMS"`. This includes reports with no damaged items and reports whose damaged items are all handled by Rekanan.
- Keep the existing report status transitions, approval rows, authorization checks, CSRF checks, PDF flow, and zero-cost fast track unchanged.
- Keep the "Estimasi BMS" summary card on the create-report review screen; this task only changes guidance and event wording.
- Derive `isChecklistOnly` before returning data to client components. Do not send the complete `Report.items` JSON solely to choose a label.
- Preserve all unrelated working-tree changes and stage only files named in the current task.
- Follow `AI_RULES.md` and `AGENTS.md`; create a dated task note before the implementation commit sequence is considered complete.

---

## File Map

### New shared modules and tests

- `app/reports/(bms)/create/components/review-step-copy.ts`: pure selection of the three "Setelah Submit" messages from client-side checklist items.
- `app/reports/(bms)/create/components/review-step-copy.spec.ts`: pure checklist, all-Rekanan, and BMS-handler coverage.
- `lib/report-activity-label.ts`: canonical activity labels plus checklist-only overrides and neutral review-filter labels.
- `lib/report-activity-label.spec.ts`: label behavior for checklist-only and BMS reports.

### Existing files to modify

- `app/reports/(bms)/create/components/review-step.tsx`: consume the review-copy helper instead of checking the number of damaged items.
- `app/dashboard/queries.ts`: add `isChecklistOnly` to `ActivityItem`, derive it from selected report items, and strip items before serialization.
- `app/dashboard/activity/activity-format.ts`: delegate labels to the shared activity-label helper and use neutral review filter text.
- `app/dashboard/_components/manager-dashboard.tsx`: pass the contextual flag for recent activity.
- `components/bms-mobile/bms-activity-item.tsx`: pass the contextual flag for BMS activity cards.
- `app/dashboard/branches/[branchName]/page.tsx`: pass the contextual flag for branch activity.
- `app/activity/_components/activity-list.tsx`: use shared contextual labels and neutral review filter text.
- `app/reports/history/_components/bmc-history-list.tsx`: use shared contextual labels and neutral review filter text.
- `app/dashboard/activity/actions.ts`: derive contextual labels server-side for the admin activity stream.
- `app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts`: delegate history labels to the shared formatter.
- `app/dashboard/reports/[reportNumber]/_components/history-tab.tsx`: derive checklist-only context from the already-loaded report items.
- `app/reports/[reportNumber]/report-detail-view.tsx`: use contextual history labels in the legacy/mobile report detail.
- `lib/notifications/dispatch.ts`: derive checklist-only context from persisted items instead of the report's current status.
- `lib/notifications/templates.ts`: render checklist-specific approval and rejection messages.
- `lib/notifications/templates.spec.ts`: preserve estimation copy and cover all checklist-specific notification variants.
- `docs/superpowers/specs/2026-08-14-contextual-checklist-labels-design.md`: record implementation status and verification evidence after all checks pass.
- `docs/agent-notes/`: implementation note generated from `docs/agent-notes/TEMPLATE.md` and named with the actual Asia/Jakarta execution timestamp.

## Interface Contracts

```ts
export function getAfterSubmitSteps(
  items: Iterable<Pick<ChecklistItem, "handler">>,
): readonly string[];

export function getReportActivityActionLabel(
  action: string,
  isChecklistOnly?: boolean,
): string;

export type ActivityItem = {
  id: string;
  reportNumber: string;
  action: string;
  notes: string | null;
  createdAt: Date;
  actor: { name: string; NIK: string };
  isChecklistOnly: boolean;
  report: {
    storeName: string;
    storeCode: string | null;
    branchName: string;
    status: string;
    completedPdfPath: string | null;
    reportFinalDriveUrl: string | null;
  };
};
```

The UI-facing activity payload carries only the boolean context. The raw `items` JSON remains inside server query/mapping code.

---

### Task 1: Select submit guidance from handler ownership

**Files:**

- Create: `app/reports/(bms)/create/components/review-step-copy.spec.ts`
- Create: `app/reports/(bms)/create/components/review-step-copy.ts`
- Modify: `app/reports/(bms)/create/components/review-step.tsx` near the "Setelah Submit" card

- [ ] **Step 1: Add a failing copy-selection test**

```ts
import assert from "node:assert/strict";
import { getAfterSubmitSteps } from "./review-step-copy";

assert.deepEqual(
  getAfterSubmitSteps([
    { handler: "" },
    { handler: "Rekanan" },
  ]),
  [
    'Status laporan menjadi "Review Checklist".',
    "BMC melakukan review checklist.",
    "Jika disetujui, laporan diteruskan ke BNM untuk persetujuan akhir.",
  ],
);

assert.deepEqual(
  getAfterSubmitSteps([
    { handler: "Rekanan" },
    { handler: "Rekanan" },
  ]),
  [
    'Status laporan menjadi "Review Checklist".',
    "BMC melakukan review checklist.",
    "Jika disetujui, laporan diteruskan ke BNM untuk persetujuan akhir.",
  ],
);

assert.deepEqual(
  getAfterSubmitSteps([
    { handler: "Rekanan" },
    { handler: "BMS" },
  ]),
  [
    'Status laporan menjadi "Menunggu Persetujuan Estimasi".',
    "BMC melakukan review estimasi dan checklist.",
    "Jika disetujui, BMS dapat mulai pekerjaan.",
  ],
);

console.log("review step copy tests passed");
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```powershell
npx tsx "app/reports/(bms)/create/components/review-step-copy.spec.ts"
```

Expected: FAIL because `review-step-copy.ts` does not exist yet.

- [ ] **Step 3: Implement the smallest pure helper**

```ts
import type { ChecklistItem } from "@/lib/checklist-data";

export const CHECKLIST_ONLY_AFTER_SUBMIT_STEPS = [
  'Status laporan menjadi "Review Checklist".',
  "BMC melakukan review checklist.",
  "Jika disetujui, laporan diteruskan ke BNM untuk persetujuan akhir.",
] as const;

export const BMS_AFTER_SUBMIT_STEPS = [
  'Status laporan menjadi "Menunggu Persetujuan Estimasi".',
  "BMC melakukan review estimasi dan checklist.",
  "Jika disetujui, BMS dapat mulai pekerjaan.",
] as const;

export function getAfterSubmitSteps(
  items: Iterable<Pick<ChecklistItem, "handler">>,
): readonly string[] {
  for (const item of items) {
    if (item.handler === "BMS") return BMS_AFTER_SUBMIT_STEPS;
  }

  return CHECKLIST_ONLY_AFTER_SUBMIT_STEPS;
}
```

- [ ] **Step 4: Use the helper in `ReviewStep`**

Add the import:

```ts
import { getAfterSubmitSteps } from "./review-step-copy";
```

Replace the `brokenChecklistItems.length === 0 ? ... : ...` expression with:

```tsx
{getAfterSubmitSteps(checklist.values()).map((item, index) => (
  <div key={item} className="flex items-center gap-3">
    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      {index + 1}
    </div>
    <p className="text-xs text-muted-foreground">{item}</p>
  </div>
))}
```

Keep the surrounding card markup and "Estimasi BMS" card unchanged.

- [ ] **Step 5: Run the focused test and lint**

Run:

```powershell
npx tsx "app/reports/(bms)/create/components/review-step-copy.spec.ts"
npx eslint "app/reports/(bms)/create/components/review-step-copy.ts" "app/reports/(bms)/create/components/review-step-copy.spec.ts" "app/reports/(bms)/create/components/review-step.tsx"
```

Expected: test prints `review step copy tests passed`; ESLint exits 0.

- [ ] **Step 6: Commit Task 1**

```powershell
git add -- "app/reports/(bms)/create/components/review-step-copy.ts" "app/reports/(bms)/create/components/review-step-copy.spec.ts" "app/reports/(bms)/create/components/review-step.tsx"
git commit -m "fix: contextualize submit guidance"
```

---

### Task 2: Centralize contextual activity labels

**Files:**

- Create: `lib/report-activity-label.spec.ts`
- Create: `lib/report-activity-label.ts`
- Modify: `app/dashboard/activity/activity-format.ts`

- [ ] **Step 1: Add failing tests for both report classes**

```ts
import assert from "node:assert/strict";
import {
  getReportActivityActionLabel,
  REVIEW_ACTIVITY_FILTER_OPTIONS,
} from "./report-activity-label";

assert.equal(
  getReportActivityActionLabel("ESTIMATION_APPROVED", true),
  "Checklist disetujui",
);
assert.equal(
  getReportActivityActionLabel("ESTIMATION_REJECTED_REVISION", true),
  "Checklist perlu direvisi",
);
assert.equal(
  getReportActivityActionLabel("ESTIMATION_REJECTED", true),
  "Checklist ditolak",
);

assert.equal(
  getReportActivityActionLabel("ESTIMATION_APPROVED", false),
  "Estimasi disetujui",
);
assert.equal(
  getReportActivityActionLabel("ESTIMATION_REJECTED_REVISION", false),
  "Estimasi ditolak revisi",
);
assert.equal(
  getReportActivityActionLabel("ESTIMATION_REJECTED", false),
  "Estimasi ditolak",
);

assert.equal(
  getReportActivityActionLabel("FINAL_APPROVED_BNM", true),
  "Disetujui final BNM",
);
assert.equal(getReportActivityActionLabel("UNKNOWN_ACTION", true), "UNKNOWN_ACTION");

assert.deepEqual(REVIEW_ACTIVITY_FILTER_OPTIONS, [
  { value: "ESTIMATION_APPROVED", label: "Review disetujui" },
  {
    value: "ESTIMATION_REJECTED_REVISION",
    label: "Review perlu direvisi",
  },
  { value: "ESTIMATION_REJECTED", label: "Review ditolak" },
]);

console.log("report activity label tests passed");
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```powershell
npx tsx lib/report-activity-label.spec.ts
```

Expected: FAIL because `lib/report-activity-label.ts` does not exist yet.

- [ ] **Step 3: Implement the shared label module**

```ts
const BASE_ACTIVITY_LABELS: Readonly<Record<string, string>> = {
  SUBMITTED: "Laporan diajukan",
  RESUBMITTED_ESTIMATION: "Laporan direvisi & diajukan ulang",
  RESUBMITTED_WORK: "Pekerjaan direvisi & diajukan ulang",
  WORK_STARTED: "Pekerjaan dimulai",
  COMPLETION_SUBMITTED: "Pekerjaan selesai diajukan",
  ESTIMATION_APPROVED: "Estimasi disetujui",
  ESTIMATION_REJECTED_REVISION: "Estimasi ditolak revisi",
  ESTIMATION_REJECTED: "Estimasi ditolak",
  WORK_APPROVED: "Pekerjaan disetujui BMC",
  WORK_REJECTED_REVISION: "Pekerjaan ditolak revisi",
  FINAL_APPROVED_BNM: "Disetujui final BNM",
  FINAL_REJECTED_REVISION_BNM: "Ditolak final BNM revisi",
  ADMIN_REALISASI_REVISED: "Realisasi direvisi admin",
  PJUM_CREATED: "PJUM diajukan",
  PJUM_APPROVED: "PJUM disetujui",
};

const CHECKLIST_ONLY_LABELS: Readonly<Record<string, string>> = {
  ESTIMATION_APPROVED: "Checklist disetujui",
  ESTIMATION_REJECTED_REVISION: "Checklist perlu direvisi",
  ESTIMATION_REJECTED: "Checklist ditolak",
};

export const REVIEW_ACTIVITY_FILTER_OPTIONS = [
  { value: "ESTIMATION_APPROVED", label: "Review disetujui" },
  {
    value: "ESTIMATION_REJECTED_REVISION",
    label: "Review perlu direvisi",
  },
  { value: "ESTIMATION_REJECTED", label: "Review ditolak" },
] as const;

export function getReportActivityActionLabel(
  action: string,
  isChecklistOnly = false,
): string {
  if (isChecklistOnly && CHECKLIST_ONLY_LABELS[action]) {
    return CHECKLIST_ONLY_LABELS[action];
  }

  return BASE_ACTIVITY_LABELS[action] ?? action;
}
```

- [ ] **Step 4: Delegate dashboard formatting and neutralize the three filters**

In `app/dashboard/activity/activity-format.ts`, import the shared exports, replace the three estimation entries in `ACTION_OPTIONS` with `...REVIEW_ACTIVITY_FILTER_OPTIONS`, and change the formatter to:

```ts
export function getActivityActionLabel(
  action: string,
  isChecklistOnly = false,
): string {
  return getReportActivityActionLabel(action, isChecklistOnly);
}
```

Do not change `getActionBadgeClass`; stored action values and visual tones stay the same.

- [ ] **Step 5: Run the focused test and lint**

Run:

```powershell
npx tsx lib/report-activity-label.spec.ts
npx eslint lib/report-activity-label.ts lib/report-activity-label.spec.ts app/dashboard/activity/activity-format.ts
```

Expected: test prints `report activity label tests passed`; ESLint exits 0.

- [ ] **Step 6: Commit Task 2**

```powershell
git add -- lib/report-activity-label.ts lib/report-activity-label.spec.ts app/dashboard/activity/activity-format.ts
git commit -m "refactor: centralize activity labels"
```

---

### Task 3: Add checklist context to activity query results and list UIs

**Files:**

- Modify: `app/dashboard/queries.ts`
- Modify: `app/dashboard/_components/manager-dashboard.tsx`
- Modify: `components/bms-mobile/bms-activity-item.tsx`
- Modify: `app/dashboard/branches/[branchName]/page.tsx`
- Modify: `app/activity/_components/activity-list.tsx`
- Modify: `app/reports/history/_components/bmc-history-list.tsx`

- [ ] **Step 1: Lock the server-to-client contract in `ActivityItem`**

Add this required property next to `action`:

```ts
isChecklistOnly: boolean;
```

Then run:

```powershell
npx tsc --noEmit --incremental false
```

Expected: FAIL at every `ActivityItem` construction that does not yet provide `isChecklistOnly`. If the full compiler is unavailable because of local memory limits, run the Task 3 ESLint command in Step 5 and record the limitation in the task note; do not treat a resource failure as a passing type check.

- [ ] **Step 2: Derive and serialize only the boolean in `fetchActivityLogs`**

Add imports:

```ts
import { isChecklistOnlyReport } from "@/lib/report-utils";
import type { ReportItemJson } from "@/types/report";
```

Add `items: true` to the internal `report.select`, then replace the return mapping with:

```ts
return rows.map((row) => {
  const { items, ...report } = row.report;
  const reportItems = Array.isArray(items)
    ? (items as unknown as ReportItemJson[])
    : [];

  return {
    ...row,
    action: row.action as string,
    isChecklistOnly: isChecklistOnlyReport(reportItems),
    report,
  };
});
```

This keeps `items` out of the returned `ActivityItem` while preserving every existing report field.

- [ ] **Step 3: Pass context through existing dashboard consumers**

Use the new second argument at all three shared-formatter call sites:

```tsx
getActivityActionLabel(activity.action, activity.isChecklistOnly)
```

Apply the equivalent `item.isChecklistOnly` call in `components/bms-mobile/bms-activity-item.tsx`.

- [ ] **Step 4: Use shared labels in the full activity and BMC history lists**

In both list components, keep the existing action-to-color objects but remove their `label` fields. Change the badge helper signature to:

```tsx
const getActivityBadge = (action: string, isChecklistOnly: boolean) => {
  const color =
    ACTIVITY_COLORS[action] ?? "bg-muted text-muted-foreground border-border";

  return (
    <Badge
      variant="outline"
      className={`text-xs px-2 py-0.5 border whitespace-nowrap ${color}`}
    >
      {getReportActivityActionLabel(action, isChecklistOnly)}
    </Badge>
  );
};
```

Call it with each activity's boolean:

```tsx
{getActivityBadge(activity.action, activity.isChecklistOnly)}
```

Replace only the three review filter labels while keeping their values:

```tsx
<SelectItem value="ESTIMATION_APPROVED">Review disetujui</SelectItem>
<SelectItem value="ESTIMATION_REJECTED_REVISION">
  Review perlu direvisi
</SelectItem>
<SelectItem value="ESTIMATION_REJECTED">Review ditolak</SelectItem>
```

- [ ] **Step 5: Run focused tests, lint, and type checking**

Run:

```powershell
npx tsx lib/report-activity-label.spec.ts
npx eslint app/dashboard/queries.ts app/dashboard/_components/manager-dashboard.tsx components/bms-mobile/bms-activity-item.tsx "app/dashboard/branches/[branchName]/page.tsx" app/activity/_components/activity-list.tsx app/reports/history/_components/bmc-history-list.tsx
npx tsc --noEmit --incremental false
```

Expected: test passes; ESLint and TypeScript exit 0.

- [ ] **Step 6: Commit Task 3**

```powershell
git add -- app/dashboard/queries.ts app/dashboard/_components/manager-dashboard.tsx components/bms-mobile/bms-activity-item.tsx "app/dashboard/branches/[branchName]/page.tsx" app/activity/_components/activity-list.tsx app/reports/history/_components/bmc-history-list.tsx
git commit -m "fix: label checklist activity context"
```

---

### Task 4: Cover admin activity and both report-history views

**Files:**

- Modify: `app/dashboard/activity/actions.ts`
- Modify: `app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts`
- Modify: `app/dashboard/reports/[reportNumber]/_components/history-tab.tsx`
- Modify: `app/reports/[reportNumber]/report-detail-view.tsx`

- [ ] **Step 1: Make the admin activity mapper contextual**

Import `Prisma` JSON typing if it is not already imported, plus:

```ts
import { getReportActivityActionLabel } from "@/lib/report-activity-label";
import { isChecklistOnlyReport } from "@/lib/report-utils";
import type { ReportItemJson } from "@/types/report";
```

Extend `mapReportActivity`'s report input:

```ts
report: {
  branchName: string;
  storeName: string;
  status: string;
  items: Prisma.JsonValue;
};
```

Derive the label inside the mapper:

```ts
const reportItems = Array.isArray(row.report.items)
  ? (row.report.items as unknown as ReportItemJson[])
  : [];
const actionLabel = getReportActivityActionLabel(
  row.action,
  isChecklistOnlyReport(reportItems),
);
```

Set `actionLabel` in the returned event and remove the local `ACTION_LABELS` and `getActionLabel`. Add `items: true` to the report select at the admin activity query. The mapper returns individual scalar fields, so the item JSON is not exposed in `AdminActivityEvent`.

- [ ] **Step 2: Make the admin report history formatter contextual**

Replace the local label map in `report-detail-utils.ts` with:

```ts
export function formatActivityAction(
  action: string,
  isChecklistOnly = false,
) {
  return getReportActivityActionLabel(action, isChecklistOnly);
}
```

In `history-tab.tsx`, derive once from the report data already on the page:

```ts
const isChecklistOnly = isChecklistOnlyReport(report.items);
```

Then render:

```tsx
{formatActivityAction(activity.action, isChecklistOnly)}
```

- [ ] **Step 3: Make the legacy/mobile report history contextual**

At the top level of `ReportDetailView`, derive:

```ts
const isChecklistOnly = isChecklistOnlyReport(report.items);
```

Pass it to the history panel:

```tsx
<HistoryPanel
  activities={report.activities}
  isChecklistOnly={isChecklistOnly}
/>
```

Replace `HISTORY_LABELS` with a tone-only map, update the panel props, and construct each configuration with the shared label:

```ts
const HISTORY_TONES: Record<string, "pos" | "neg" | "neutral"> = {
  SUBMITTED: "pos",
  RESUBMITTED_ESTIMATION: "pos",
  RESUBMITTED_WORK: "pos",
  WORK_STARTED: "pos",
  COMPLETION_SUBMITTED: "pos",
  ESTIMATION_APPROVED: "pos",
  ESTIMATION_REJECTED_REVISION: "neg",
  ESTIMATION_REJECTED: "neg",
  WORK_APPROVED: "pos",
  WORK_REJECTED_REVISION: "neg",
  FINAL_APPROVED_BNM: "pos",
  FINAL_REJECTED_REVISION_BNM: "neg",
};

const label = getReportActivityActionLabel(entry.action, isChecklistOnly);
const tone = HISTORY_TONES[entry.action] ?? "neutral";
```

Render `label`, and keep the existing tone-to-dot-color behavior unchanged.

- [ ] **Step 4: Verify the admin and detail surfaces**

Run:

```powershell
npx tsx lib/report-activity-label.spec.ts
npx eslint app/dashboard/activity/actions.ts "app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts" "app/dashboard/reports/[reportNumber]/_components/history-tab.tsx" "app/reports/[reportNumber]/report-detail-view.tsx"
npx tsc --noEmit --incremental false
```

Expected: test passes; ESLint and TypeScript exit 0.

- [ ] **Step 5: Commit Task 4**

```powershell
git add -- app/dashboard/activity/actions.ts "app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts" "app/dashboard/reports/[reportNumber]/_components/history-tab.tsx" "app/reports/[reportNumber]/report-detail-view.tsx"
git commit -m "fix: contextualize report histories"
```

---

### Task 5: Make notification wording follow persisted handlers

**Files:**

- Modify: `lib/notifications/templates.spec.ts`
- Modify: `lib/notifications/templates.ts`
- Modify: `lib/notifications/dispatch.ts`

- [ ] **Step 1: Add failing checklist notification assertions**

Append these cases to `lib/notifications/templates.spec.ts`:

```ts
const checklistApprovedTemplate = buildNotificationTemplate({
  type: "REPORT_ESTIMATION_APPROVED",
  actorNIK: "BMC001",
  recipientRole: UserRole.BMS,
  report,
  isChecklistOnly: true,
});

assert.equal(checklistApprovedTemplate.title, "Checklist disetujui BMC");
assert.match(checklistApprovedTemplate.body, /diteruskan ke BNM/i);

const checklistRevisionTemplate = buildNotificationTemplate({
  type: "REPORT_ESTIMATION_REJECTED_REVISION",
  actorNIK: "BMC001",
  recipientRole: UserRole.BMS,
  report,
  isChecklistOnly: true,
});

assert.equal(checklistRevisionTemplate.title, "Checklist perlu direvisi");
assert.match(checklistRevisionTemplate.body, /review checklist/i);

const checklistRejectedTemplate = buildNotificationTemplate({
  type: "REPORT_ESTIMATION_REJECTED",
  actorNIK: "BMC001",
  recipientRole: UserRole.BMS,
  report,
  isChecklistOnly: true,
});

assert.equal(checklistRejectedTemplate.title, "Checklist ditolak");
assert.match(checklistRejectedTemplate.body, /ditolak oleh BMC/i);

const checklistFinalReviewTemplate = buildNotificationTemplate({
  type: "REPORT_WORK_APPROVED",
  actorNIK: "BMC001",
  recipientRole: UserRole.BNM_MANAGER,
  report,
  isChecklistOnly: true,
});

assert.equal(
  checklistFinalReviewTemplate.title,
  "Checklist menunggu persetujuan final",
);
assert.match(checklistFinalReviewTemplate.body, /disetujui BMC/i);

assert.equal(bmsTemplate.title, "Estimasi disetujui");
assert.match(bmsTemplate.body, /boleh mulai pekerjaan/i);
```

- [ ] **Step 2: Run the template test and confirm RED**

Run:

```powershell
npx tsx lib/notifications/templates.spec.ts
```

Expected: FAIL because checklist-only approval/rejection events still use estimation or work wording.

- [ ] **Step 3: Add contextual branches to notification templates**

Use these exact checklist-only variants while leaving existing estimation variants as the `false` branch:

```ts
case "REPORT_ESTIMATION_APPROVED":
  return context.isChecklistOnly
    ? {
        ...base,
        title: "Checklist disetujui BMC",
        body: `${reportLabel(report)} sudah disetujui BMC dan diteruskan ke BNM untuk persetujuan final.`,
      }
    : {
        ...base,
        title: "Estimasi disetujui",
        body: `${reportLabel(report)} sudah disetujui. BMS boleh mulai pekerjaan.`,
      };
case "REPORT_ESTIMATION_REJECTED_REVISION":
  return context.isChecklistOnly
    ? {
        ...base,
        title: "Checklist perlu direvisi",
        body: `${reportLabel(report)} dikembalikan untuk revisi review checklist. Buka laporan untuk melihat catatan.`,
      }
    : {
        ...base,
        title: "Estimasi perlu direvisi",
        body: `${reportLabel(report)} dikembalikan untuk revisi. Buka laporan untuk melihat catatan.`,
      };
case "REPORT_ESTIMATION_REJECTED":
  return context.isChecklistOnly
    ? {
        ...base,
        title: "Checklist ditolak",
        body: `${reportLabel(report)} ditolak oleh BMC. Buka laporan untuk melihat catatan.`,
      }
    : {
        ...base,
        title: "Estimasi ditolak",
        body: `${reportLabel(report)} ditolak oleh BMC.`,
      };
case "REPORT_WORK_APPROVED":
  return context.isChecklistOnly
    ? {
        ...base,
        title: "Checklist menunggu persetujuan final",
        body: `${reportLabel(report)} sudah disetujui BMC dan menunggu persetujuan final BNM.`,
      }
    : {
        ...base,
        title: "Pekerjaan disetujui BMC",
        body: `${reportLabel(report)} sudah diteruskan ke BNM untuk approval final.`,
      };
```

- [ ] **Step 4: Derive notification context from persisted report items**

In `lib/notifications/dispatch.ts`, import `isChecklistOnlyReport` and `ReportItemJson`, select `items: true`, then derive before calling `createAndPushNotifications`:

```ts
const reportItems = Array.isArray(report.items)
  ? (report.items as unknown as ReportItemJson[])
  : [];
const isChecklistOnly = isChecklistOnlyReport(reportItems);
const notificationReport = {
  reportNumber: report.reportNumber,
  storeCode: report.storeCode,
  storeName: report.storeName,
  branchName: report.branchName,
  areaName: report.areaName,
  createdByNIK: report.createdByNIK,
};

await createAndPushNotifications({
  type: input.type,
  actorNIK: input.actorNIK,
  recipients,
  report: notificationReport,
  notes: "notes" in input ? input.notes : null,
  isChecklistOnly,
});
```

Remove the old `report.status === "PENDING_CHECKLIST_REVIEW"` derivation. This is essential because BMC approval changes the status to `APPROVED_BMC` before notification dispatch, while handler ownership remains stable.

- [ ] **Step 5: Run notification tests, lint, and type checking**

Run:

```powershell
npx tsx lib/notifications/templates.spec.ts
npx eslint lib/notifications/templates.ts lib/notifications/templates.spec.ts lib/notifications/dispatch.ts
npx tsc --noEmit --incremental false
```

Expected: notification tests pass; ESLint and TypeScript exit 0.

- [ ] **Step 6: Commit Task 5**

```powershell
git add -- lib/notifications/templates.ts lib/notifications/templates.spec.ts lib/notifications/dispatch.ts
git commit -m "fix: contextualize checklist notifications"
```

---

### Task 6: Complete regression verification and project documentation

**Files:**

- Modify: `docs/superpowers/specs/2026-08-14-contextual-checklist-labels-design.md`
- Create: one dated `docs/agent-notes/` implementation note using the actual Asia/Jakarta execution timestamp

- [ ] **Step 1: Search for stale estimation labels in affected surfaces**

Run:

```powershell
Get-ChildItem app,components,lib -Recurse -File -Include *.ts,*.tsx | Select-String -Pattern 'Estimasi disetujui|Estimasi ditolak|Menunggu Persetujuan Estimasi'
```

Expected: remaining occurrences are one of these intentional cases:

- canonical BMS-report labels inside `lib/report-activity-label.ts`;
- the BMS branch of `review-step-copy.ts`;
- the non-checklist branches in `lib/notifications/templates.ts`;
- status labels that describe the unchanged estimation workflow;
- tests that assert estimation wording remains intact.

Any duplicate activity-label map in a rendered surface is a failure and must be replaced with the shared helper.

- [ ] **Step 2: Run all focused tests**

Run:

```powershell
npx tsx "app/reports/(bms)/create/components/review-step-copy.spec.ts"
npx tsx lib/report-activity-label.spec.ts
npx tsx lib/notifications/templates.spec.ts
```

Expected: all three commands exit 0 and print their pass messages.

- [ ] **Step 3: Run project-level checks**

Run:

```powershell
npm run lint
npm run build
```

Expected: both commands exit 0. If an unrelated pre-existing failure occurs, capture the exact command, error, and affected file in the task note; still run every focused test and the changed-file ESLint commands.

- [ ] **Step 4: Perform the HEAD OFFICE manual regression matrix**

Use the local/private database confirmed by `.env`; do not run destructive cleanup as part of this task.

1. Submit a HEAD OFFICE report with no damaged items.
   - Review screen says "Review Checklist" and describes BMC then BNM.
   - BMC approval produces "Checklist disetujui" in BNM recent activity.
   - BNM receives "Checklist menunggu persetujuan final".
2. Submit a HEAD OFFICE report with damaged items handled only by Rekanan.
   - It shows the same checklist-only copy and labels.
   - It never tells BMS to start work.
3. Submit a report with at least one BMS handler.
   - Review screen still says "Menunggu Persetujuan Estimasi".
   - BMC approval still renders "Estimasi disetujui".
   - BMS notification still says BMS may start work.
4. Inspect BMS activity, BMC history, BNM dashboard, branch detail, admin activity, admin report detail, and legacy/mobile report history for the same report.
   - Each checklist-only event uses checklist wording.
   - Each BMS-handled event retains estimation wording.
5. Exercise revision and rejection for a checklist-only test report if the simulation data permits it.
   - Labels and notifications say "Checklist perlu direvisi" or "Checklist ditolak".

- [ ] **Step 5: Update documentation and write the required task note**

Append an implementation section to the design spec containing:

```md
## Implementation Status

Implemented without Prisma schema or migration changes. Checklist context is
derived from persisted item handlers and passed as a boolean to client activity
surfaces. Stored report statuses and activity action values remain unchanged.

Verification evidence is recorded in the dated implementation note under
`docs/agent-notes/`.
```

Create the agent note from `docs/agent-notes/TEMPLATE.md` using the actual Asia/Jakarta timestamp at execution time. List every changed file, the no-schema decision, focused test results, project-level checks, manual scenarios completed, and any genuine remaining risks. Do not include environment values, credentials, raw SQL output, personal data, or production records.

- [ ] **Step 6: Review the diff for accidental schema or data changes**

Run:

```powershell
git diff --check
git status --short
git diff -- prisma/schema.prisma prisma/migrations
```

Expected:

- `git diff --check` exits 0;
- only intended source, test, design, and task-note files are part of this implementation;
- the Prisma diff is empty;
- unrelated pre-existing working-tree files remain unstaged.

- [ ] **Step 7: Commit documentation**

Stage the exact design spec and the newly created dated task note, then commit:

```powershell
git commit -m "docs: record checklist label rollout"
```

- [ ] **Step 8: Final self-review**

- Coverage review: pure checklist, all-Rekanan, at-least-one-BMS, approve, revision, rejection, BNM forwarding, and unchanged estimation copy are all tested or manually verified.
- Unfinished-marker scan: no placeholder copy, deferred implementation marker, or disabled assertion was introduced.
- Type consistency: `isChecklistOnly` is required on `ActivityItem`, remains server-derived, and every consumer passes it to the formatter.
- Data safety: no schema, migration, database cleanup, raw SQL, or backfill was added.
- UI consistency: all activity/history surfaces use `getReportActivityActionLabel`; filters use neutral review wording while stored values remain unchanged.
