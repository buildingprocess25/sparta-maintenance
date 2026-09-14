# Hybrid Server Draft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make BMS draft reports resumable from the report list and from another device without creating excessive autosave traffic or changing PJUM business rules.

**Architecture:** Keep localStorage as the fast local draft cache, and add server-side draft persistence into the existing `Report` row while its status is `DRAFT`. Server draft writes happen only on meaningful checkpoints, a 17-second idle timer, and submit; the submit payload remains the final source of truth. DRAFT rows remain excluded from PJUM, realisasi, approval, and final export calculations.

**Tech Stack:** Next.js App Router, React client hooks, Prisma 7, PostgreSQL, Zod v4, existing `tsx` + `node:assert` specs.

## Global Constraints

- Do not autosave every keystroke/change to the server.
- Server idle autosave waits 17 seconds after the latest change.
- Save to server when selecting a store, uploading a photo, moving between form steps with the `Lanjutkan` button, best-effort page leave, and submit.
- Photos must not be re-uploaded by server autosave; autosave only stores `photoUrl` and `photoKey`.
- Submit always sends the latest in-memory form state and wins over any older draft autosave.
- `Report.status = DRAFT` must not count toward PJUM, realisasi, approval queues, completed exports, or finance dashboards.
- Clicking a `DRAFT` row on `/reports` must resume that draft instead of opening an empty create form.
- If localStorage and server draft both exist, choose the newer draft by saved timestamp; localStorage can win on the same device, server can restore on another device.
- Follow existing shadcn/ui usage; no new custom visual component is needed for this work.

---

## File Structure

- Modify `app/reports/actions/types.ts`: add a relaxed autosave schema for incomplete drafts, separate from submit validation.
- Modify `app/reports/actions/draft.ts`: add `saveServerDraft()` and `getDraftByReportNumber()` server actions/helpers for BMS-owned DRAFT rows.
- Modify `app/reports/actions.ts`: export the new draft actions.
- Create `app/reports/(bms)/create/hooks/use-server-draft-autosave.ts`: own hybrid server autosave scheduling, dirty tracking, 17-second idle flush, explicit checkpoint flushes, and best-effort pagehide flush.
- Modify `app/reports/(bms)/create/hooks/use-draft.ts`: compare localStorage and server draft, restore the newest source, and preserve localStorage behavior.
- Modify `app/reports/(bms)/create/hooks/use-photo-upload.ts`: flush server draft after a successful photo upload by ensuring the draft report number is available to the autosave hook.
- Modify `app/reports/(bms)/create/create-form.tsx`: wire the server autosave hook, flush on step changes, and keep submit as final source of truth.
- Modify `app/reports/(bms)/create/page.tsx`: load BMS-owned DRAFT data when `restore=1` or `draft=<reportNumber>` is present.
- Modify `app/reports/_components/bms-reports-mobile.tsx` and `app/reports/_components/bms-reports-list.tsx`: link DRAFT rows to the clicked draft number.
- Add focused specs beside touched code using the repo's `tsx`/`node:assert` style.
- Update canonical docs and add an agent note after implementation.

---

### Task 1: Server Draft Autosave Contract

**Files:**
- Modify: `app/reports/actions/types.ts`
- Modify: `app/reports/actions/draft.ts`
- Modify: `app/reports/actions.ts`
- Test: `app/reports/actions/draft-autosave-schema.spec.ts`

**Interfaces:**
- Consumes: existing `DraftData`, `buildItemsJson(data)`, `buildEstimationsJson(data)`, `ensureDriveDraftReport(storeCode)`.
- Produces:
  - `draftAutosaveDataSchema: z.ZodType<DraftData>`
  - `saveServerDraft(data: DraftData): Promise<{ success: true; reportNumber: string; savedAt: string } | { error: string; detail?: string }>`
  - `getDraftByReportNumber(reportNumber: string): Promise<SerializedDraft | null>`

- [ ] **Step 1: Write the failing schema spec**

Create `app/reports/actions/draft-autosave-schema.spec.ts`:

```ts
import assert from "node:assert/strict";
import { draftAutosaveDataSchema } from "./types";

const incompleteDamagedDraft = draftAutosaveDataSchema.safeParse({
    draftReportNumber: "A08-20260914-001",
    storeCode: "A08",
    storeName: "Alfamart 08",
    branchName: "TANGERANG",
    checklistItems: [
        {
            itemId: "A1",
            itemName: "Bahu Jalan",
            categoryName: "A. Bangunan",
            condition: "RUSAK",
            handler: "BMS",
        },
    ],
    bmsEstimations: {},
    totalEstimation: 0,
    draftCreatedAt: "2026-09-14T13:00:00.000Z",
});

assert.equal(
    incompleteDamagedDraft.success,
    true,
    "autosave schema must accept incomplete damaged items; submit validation remains stricter",
);

const unknownItem = draftAutosaveDataSchema.safeParse({
    checklistItems: [{ itemId: "UNKNOWN", itemName: "X", categoryName: "X" }],
    bmsEstimations: {},
});

assert.equal(unknownItem.success, false, "autosave must still reject unknown checklist item IDs");

console.log("draft autosave schema tests passed");
```

- [ ] **Step 2: Run the spec and verify it fails**

Run:

```powershell
npx tsx "app/reports/actions/draft-autosave-schema.spec.ts"
```

Expected: FAIL because `draftAutosaveDataSchema` is not exported.

- [ ] **Step 3: Add relaxed autosave validation**

In `app/reports/actions/types.ts`, add a builder option so submit stays strict and autosave is relaxed:

```ts
function buildDraftDataSchema(
    allowedItemIds: ReadonlySet<string>,
    options: { requireDamagedDetails: boolean } = { requireDamagedDetails: true },
) {
    const checklistItemSchema = z
        .object({
            itemId: z
                .string()
                .min(1)
                .refine((itemId) => allowedItemIds.has(itemId), {
                    message: "Item checklist tidak dikenal",
                }),
            itemName: z.string().min(1).max(300),
            categoryName: z.string().max(200),
            condition: z.enum(["BAIK", "RUSAK", "TIDAK_ADA"]).optional(),
            preventiveCondition: z
                .enum(["OK", "NOT_OK", "TIDAK_ADA"])
                .optional(),
            handler: z.enum(["BMS", "REKANAN"]).optional(),
            photoUrl: z.string().max(2048).optional(),
            photoKey: z.string().max(500).optional(),
            notes: z.string().max(2000).optional(),
            ahoTicketNumber: z.string().trim().max(100).optional(),
        })
        .superRefine((item, ctx) => {
            if (!options.requireDamagedDetails) return;

            const isDamaged =
                item.condition === "RUSAK" ||
                item.preventiveCondition === "NOT_OK";

            if (isDamaged && !item.notes?.trim()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["notes"],
                    message: "Catatan wajib diisi untuk item rusak",
                });
            }
            if (isDamaged && !item.ahoTicketNumber?.trim()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["ahoTicketNumber"],
                    message: "Nomor tiket AHO wajib diisi untuk item rusak",
                });
            }
        });

    return z
        .object({
            draftReportNumber: z.string().trim().min(1).max(100).optional(),
            storeCode: z.string().max(50).optional(),
            storeName: z.string().max(300).optional(),
            branchName: z.string().max(200).optional(),
            checklistItems: z
                .array(checklistItemSchema)
                .max(Math.max(1, allowedItemIds.size)),
            bmsEstimations: z.record(
                z.string(),
                z.array(bmsEstimationSchema).max(100),
            ),
            totalEstimation: z.number().min(0).optional(),
            draftCreatedAt: z.string().datetime().optional(),
        })
        .superRefine((data, ctx) => {
            const itemIds = new Set<string>();
            data.checklistItems.forEach((item, index) => {
                if (itemIds.has(item.itemId)) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["checklistItems", index, "itemId"],
                        message: "Item checklist tidak boleh duplikat",
                    });
                }
                itemIds.add(item.itemId);
            });

            for (const itemId of Object.keys(data.bmsEstimations)) {
                if (!allowedItemIds.has(itemId)) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["bmsEstimations", itemId],
                        message:
                            "Estimasi mengacu ke item checklist tidak dikenal",
                    });
                }
            }
        });
}

export const draftDataSchema = buildDraftDataSchema(canonicalChecklistItemIds);

export const draftAutosaveDataSchema = buildDraftDataSchema(
    canonicalChecklistItemIds,
    { requireDamagedDetails: false },
);
```

- [ ] **Step 4: Add server autosave action**

In `app/reports/actions/draft.ts`, add imports:

```ts
import { revalidatePath } from "next/cache";
import { ensureDriveDraftReport } from "./ensure-drive-draft";
import { draftAutosaveDataSchema } from "./types";
```

Then add:

```ts
export async function saveServerDraft(data: DraftData) {
    const parsed = draftAutosaveDataSchema.safeParse(data);
    if (!parsed.success) {
        return {
            error: "Data draft tidak valid",
            detail: "Draft belum bisa disimpan ke server.",
        };
    }

    try {
        const user = await requireRole("BMS");
        const headersList = await headers();
        await validateCSRF(headersList);

        let draftReportNumber = parsed.data.draftReportNumber;
        if (!draftReportNumber) {
            if (!parsed.data.storeCode) {
                return { error: "Pilih toko sebelum menyimpan draft" };
            }
            const reserved = await ensureDriveDraftReport(parsed.data.storeCode);
            if ("error" in reserved) return reserved;
            draftReportNumber = reserved.reportNumber;
        }

        const itemsJson = buildItemsJson(parsed.data);
        const estimationsJson = buildEstimationsJson(parsed.data);

        const updated = await prisma.report.updateMany({
            where: {
                reportNumber: draftReportNumber,
                createdByNIK: user.NIK,
                status: "DRAFT",
            },
            data: {
                storeCode: parsed.data.storeCode || null,
                storeName: parsed.data.storeName || "",
                branchName: parsed.data.branchName || user.branchNames[0] || "",
                totalEstimation: parsed.data.totalEstimation || 0,
                items: itemsJson,
                estimations: estimationsJson,
            },
        });

        if (updated.count !== 1) {
            return { error: "Draft laporan tidak ditemukan" };
        }

        revalidatePath("/reports");
        return {
            success: true as const,
            reportNumber: draftReportNumber,
            savedAt: new Date().toISOString(),
        };
    } catch (error) {
        logger.error(
            { operation: "saveServerDraft" },
            "Failed to autosave BMS server draft",
            error,
        );
        return {
            error: "Gagal menyimpan draft ke server",
            detail: getErrorDetail(error),
        };
    }
}
```

- [ ] **Step 5: Export the action**

In `app/reports/actions.ts`, ensure these exports exist:

```ts
export {
    getDraft,
    getDraftByReportNumber,
    discardDriveDraftReport,
    discardLocalDraftFiles,
    saveServerDraft,
} from "./actions/draft";
```

- [ ] **Step 6: Run focused tests**

Run:

```powershell
npx tsx "app/reports/actions/draft-autosave-schema.spec.ts"
npx tsx "app/reports/(bms)/create/hooks/draft-data.spec.ts"
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```powershell
git add "app/reports/actions/types.ts" "app/reports/actions/draft.ts" "app/reports/actions.ts" "app/reports/actions/draft-autosave-schema.spec.ts"
git commit -m "feat: add server draft autosave action"
```

---

### Task 2: Restore BMS Draft From Server

**Files:**
- Modify: `app/reports/actions/draft.ts`
- Modify: `app/reports/(bms)/create/page.tsx`
- Modify: `app/reports/(bms)/create/hooks/use-draft.ts`
- Test: `app/reports/(bms)/create/hooks/use-draft-source.spec.ts`

**Interfaces:**
- Consumes: `SerializedDraft` from `app/reports/(bms)/create/components/types.ts`.
- Produces:
  - `getDraftByReportNumber(reportNumber: string): Promise<SerializedDraft | null>`
  - local source chooser: `chooseDraftSource(local, server): "local" | "server" | null`

- [ ] **Step 1: Write source-choice spec**

Create `app/reports/(bms)/create/hooks/use-draft-source.spec.ts`:

```ts
import assert from "node:assert/strict";
import { chooseDraftSource } from "./use-draft";

assert.equal(
    chooseDraftSource(
        { savedAt: "2026-09-14T13:00:10.000Z" },
        { updatedAt: "2026-09-14T13:00:00.000Z" },
    ),
    "local",
);

assert.equal(
    chooseDraftSource(
        { savedAt: "2026-09-14T13:00:00.000Z" },
        { updatedAt: "2026-09-14T13:00:10.000Z" },
    ),
    "server",
);

assert.equal(chooseDraftSource(null, { updatedAt: "2026-09-14T13:00:10.000Z" }), "server");
assert.equal(chooseDraftSource(null, null), null);

console.log("draft source selection tests passed");
```

- [ ] **Step 2: Run and verify failure**

```powershell
npx tsx "app/reports/(bms)/create/hooks/use-draft-source.spec.ts"
```

Expected: FAIL because `chooseDraftSource` is not exported.

- [ ] **Step 3: Add `getDraftByReportNumber` serialization**

In `app/reports/actions/draft.ts`, add:

```ts
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import { getChecklistItemMeta } from "@/lib/checklist-data";
import { formatJakartaDateTime } from "@/lib/time";
```

Then add:

```ts
export async function getDraftByReportNumber(reportNumber: string) {
    const user = await requireRole("BMS");

    const draft = await prisma.report.findFirst({
        where: {
            reportNumber,
            createdByNIK: user.NIK,
            status: "DRAFT",
        },
        select: {
            reportNumber: true,
            storeCode: true,
            storeName: true,
            branchName: true,
            totalEstimation: true,
            items: true,
            estimations: true,
            updatedAt: true,
        },
    });

    if (!draft) return null;

    const items = (draft.items ?? []) as unknown as ReportItemJson[];
    const estimations = (draft.estimations ?? []) as unknown as MaterialEstimationJson[];

    return {
        reportNumber: draft.reportNumber,
        storeName: draft.storeName,
        storeCode: draft.storeCode || "",
        branchName: draft.branchName,
        totalEstimation: Number(draft.totalEstimation),
        updatedAt: formatJakartaDateTime(draft.updatedAt),
        items: items.map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName || getChecklistItemMeta(item.itemId)?.itemName || item.itemId,
            categoryName: item.categoryName || getChecklistItemMeta(item.itemId)?.categoryName || "-",
            condition: item.condition,
            preventiveCondition: item.preventiveCondition,
            handler: item.handler,
            photoUrl: item.photoUrl ?? item.images?.[0] ?? null,
            images: item.images ?? [],
            notes: item.notes ?? null,
            ahoTicketNumber: item.ahoTicketNumber ?? null,
        })),
        estimations: estimations.map((est) => ({
            itemId: est.itemId,
            materialName: est.materialName,
            quantity: est.quantity,
            unit: est.unit,
            price: est.price,
            totalPrice: est.totalPrice,
        })),
    };
}
```

- [ ] **Step 4: Load server draft on create page**

In `app/reports/(bms)/create/page.tsx`, change search params and load:

```ts
import { getDraft, getDraftByReportNumber } from "@/app/reports/actions";
```

```ts
searchParams: Promise<{ restore?: string; storeCode?: string; draft?: string }>;
```

```ts
const { restore, storeCode, draft } = await searchParams;
const autoRestoreOnMount = restore === "1";
const existingDraft =
    autoRestoreOnMount && draft
        ? await getDraftByReportNumber(draft)
        : autoRestoreOnMount
          ? await getDraft()
          : null;
```

Pass `existingDraft={existingDraft}` instead of `undefined`.

- [ ] **Step 5: Add source chooser and restore fallback**

In `app/reports/(bms)/create/hooks/use-draft.ts`, export:

```ts
export function chooseDraftSource(
    localDraft: { savedAt?: string } | null,
    serverDraft: { updatedAt?: string } | null,
): "local" | "server" | null {
    if (!localDraft && !serverDraft) return null;
    if (localDraft && !serverDraft) return "local";
    if (!localDraft && serverDraft) return "server";

    const localTime = Date.parse(localDraft?.savedAt || "");
    const serverTime = Date.parse(serverDraft?.updatedAt || "");
    if (Number.isNaN(localTime)) return "server";
    if (Number.isNaN(serverTime)) return "local";
    return localTime >= serverTime ? "local" : "server";
}
```

Then in the localStorage read effect, do not skip local read merely because `autoRestore` is true. Read localStorage first, compute `chooseDraftSource(parsedLocal, existingDraft)`, and:

```ts
const source = chooseDraftSource(parsedLocal, existingDraft ?? null);
if (source === "local" && parsedLocal) {
    setLocalDraftData(parsedLocal);
}
if (source === "server" && existingDraft) {
    setShowDraftDialog(false);
}
```

Keep server auto-restore logic for `existingDraft`, but allow local dialog when local wins.

- [ ] **Step 6: Run focused tests**

```powershell
npx tsx "app/reports/(bms)/create/hooks/use-draft-source.spec.ts"
npx tsx "app/reports/(bms)/create/create-form.draft-dialog.spec.ts"
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```powershell
git add "app/reports/actions/draft.ts" "app/reports/(bms)/create/page.tsx" "app/reports/(bms)/create/hooks/use-draft.ts" "app/reports/(bms)/create/hooks/use-draft-source.spec.ts"
git commit -m "fix: restore clicked BMS draft"
```

---

### Task 3: Hybrid Client Autosave Hook

**Files:**
- Create: `app/reports/(bms)/create/hooks/use-server-draft-autosave.ts`
- Modify: `app/reports/(bms)/create/create-form.tsx`
- Test: `app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts`

**Interfaces:**
- Consumes: `buildDraftData(): DraftData`, `saveServerDraft(data)`, `draftReportId`, `setDraftReportId`.
- Produces:
  - `SERVER_DRAFT_IDLE_MS = 17_000`
  - `useServerDraftAutosave(params): { markDirty(): void; flushServerDraft(reason): Promise<void> }`

- [ ] **Step 1: Write the timing contract spec**

Create `app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts`:

```ts
import assert from "node:assert/strict";
import { SERVER_DRAFT_IDLE_MS, shouldServerAutosave } from "./use-server-draft-autosave";

assert.equal(SERVER_DRAFT_IDLE_MS, 17_000);

assert.equal(
    shouldServerAutosave({
        isSubmitting: false,
        hasStore: true,
        isDirty: true,
        inFlight: false,
    }),
    true,
);

assert.equal(
    shouldServerAutosave({
        isSubmitting: false,
        hasStore: false,
        isDirty: true,
        inFlight: false,
    }),
    false,
);

assert.equal(
    shouldServerAutosave({
        isSubmitting: true,
        hasStore: true,
        isDirty: true,
        inFlight: false,
    }),
    false,
);

console.log("server draft autosave contract tests passed");
```

- [ ] **Step 2: Run and verify failure**

```powershell
npx tsx "app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts"
```

Expected: FAIL because the hook file does not exist.

- [ ] **Step 3: Implement the hook**

Create `app/reports/(bms)/create/hooks/use-server-draft-autosave.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef } from "react";
import { saveServerDraft } from "@/app/reports/actions";
import type { DraftData } from "@/app/reports/actions";

export const SERVER_DRAFT_IDLE_MS = 17_000;

export function shouldServerAutosave(input: {
    isSubmitting: boolean;
    hasStore: boolean;
    isDirty: boolean;
    inFlight: boolean;
}) {
    return (
        !input.isSubmitting &&
        input.hasStore &&
        input.isDirty &&
        !input.inFlight
    );
}

type UseServerDraftAutosaveParams = {
    selectedStoreCode: string;
    isSubmitting: boolean;
    buildDraftData: () => DraftData;
    setDraftReportId: (id: string) => void;
};

export function useServerDraftAutosave({
    selectedStoreCode,
    isSubmitting,
    buildDraftData,
    setDraftReportId,
}: UseServerDraftAutosaveParams) {
    const dirtyRef = useRef(false);
    const inFlightRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const flushServerDraft = useCallback(
        async (_reason: "store" | "photo" | "step" | "idle" | "pagehide") => {
            if (
                !shouldServerAutosave({
                    isSubmitting,
                    hasStore: !!selectedStoreCode,
                    isDirty: dirtyRef.current,
                    inFlight: inFlightRef.current,
                })
            ) {
                return;
            }

            clearTimer();
            inFlightRef.current = true;
            try {
                const result = await saveServerDraft(buildDraftData());
                if ("success" in result) {
                    dirtyRef.current = false;
                    setDraftReportId(result.reportNumber);
                }
            } finally {
                inFlightRef.current = false;
            }
        },
        [buildDraftData, clearTimer, isSubmitting, selectedStoreCode, setDraftReportId],
    );

    const markDirty = useCallback(() => {
        dirtyRef.current = true;
        clearTimer();
        timerRef.current = setTimeout(() => {
            void flushServerDraft("idle");
        }, SERVER_DRAFT_IDLE_MS);
    }, [clearTimer, flushServerDraft]);

    useEffect(() => {
        const onPageHide = () => {
            void flushServerDraft("pagehide");
        };
        window.addEventListener("pagehide", onPageHide);
        return () => {
            window.removeEventListener("pagehide", onPageHide);
            clearTimer();
        };
    }, [clearTimer, flushServerDraft]);

    return { markDirty, flushServerDraft };
}
```

- [ ] **Step 4: Wire autosave into form**

In `app/reports/(bms)/create/create-form.tsx`, import:

```ts
import { useEffect } from "react";
import { useServerDraftAutosave } from "./hooks/use-server-draft-autosave";
```

Replace the existing React import with one import that includes both hooks if needed.

After `buildDraftData` is available:

```ts
const { markDirty, flushServerDraft } = useServerDraftAutosave({
  selectedStoreCode,
  isSubmitting,
  buildDraftData,
  setDraftReportId,
});

useEffect(() => {
  markDirty();
}, [selectedStoreCode, checklist, bmsItems, grandTotalBms, markDirty]);
```

In `handleNext`, flush before changing steps:

```ts
void flushServerDraft("step");
```

In store selection:

```tsx
onStoreSelect={(code) => {
  handleStoreChange(code);
  markDirty();
  void flushServerDraft("store");
}}
```

- [ ] **Step 5: Ensure photo upload marks server draft dirty**

Pass a callback into `usePhotoUpload` from `create-form.tsx`:

```ts
onPhotoUploaded={() => {
  markDirty();
  void flushServerDraft("photo");
}}
```

Update `app/reports/(bms)/create/hooks/use-photo-upload.ts` params:

```ts
onPhotoUploaded?: () => void;
```

Call `onPhotoUploaded?.()` after checklist state is updated and the upload succeeds.

- [ ] **Step 6: Run focused tests**

```powershell
npx tsx "app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts"
npx tsx "app/reports/(bms)/create/hooks/draft-data.spec.ts"
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```powershell
git add "app/reports/(bms)/create/hooks/use-server-draft-autosave.ts" "app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts" "app/reports/(bms)/create/create-form.tsx" "app/reports/(bms)/create/hooks/use-photo-upload.ts"
git commit -m "feat: add hybrid server draft autosave"
```

---

### Task 4: Draft List Click Targets

**Files:**
- Modify: `app/reports/_components/bms-reports-mobile.tsx`
- Modify: `app/reports/_components/bms-reports-list.tsx`
- Test: `app/reports/_components/bms-draft-links.spec.ts`

**Interfaces:**
- Consumes: `ReportData.reportNumber`.
- Produces: DRAFT href `/reports/create?restore=1&draft=<encoded reportNumber>`.

- [ ] **Step 1: Write source-level link spec**

Create `app/reports/_components/bms-draft-links.spec.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mobile = readFileSync(new URL("./bms-reports-mobile.tsx", import.meta.url), "utf8");
const desktop = readFileSync(new URL("./bms-reports-list.tsx", import.meta.url), "utf8");

assert.match(
    mobile,
    /\/reports\/create\?restore=1&draft=\$\{encodeURIComponent\(report\.reportNumber\)\}/,
    "mobile DRAFT rows must target the clicked draft report number",
);

assert.match(
    desktop,
    /\/reports\/create\?restore=1&draft=\$\{encodeURIComponent\(report\.reportNumber\)\}/,
    "desktop DRAFT rows/actions must target the clicked draft report number",
);

console.log("BMS draft links assertion passed");
```

- [ ] **Step 2: Run and verify failure**

```powershell
npx tsx "app/reports/_components/bms-draft-links.spec.ts"
```

Expected: FAIL because current links use `/reports/create?restore=1`.

- [ ] **Step 3: Update mobile href**

In `app/reports/_components/bms-reports-mobile.tsx`, replace DRAFT href:

```ts
const href =
    report.status === "DRAFT"
        ? `/reports/create?restore=1&draft=${encodeURIComponent(report.reportNumber)}`
        : `/reports/${report.reportNumber}`;
```

- [ ] **Step 4: Update desktop action href and row click**

In `app/reports/_components/bms-reports-list.tsx`, add helper near `getActionButton`:

```ts
const getDraftHref = (reportNumber: string) =>
    `/reports/create?restore=1&draft=${encodeURIComponent(reportNumber)}`;
```

Use it in action and row click:

```ts
report.status === "DRAFT"
    ? getDraftHref(report.reportNumber)
    : ...
```

- [ ] **Step 5: Run focused tests**

```powershell
npx tsx "app/reports/_components/bms-draft-links.spec.ts"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add "app/reports/_components/bms-reports-mobile.tsx" "app/reports/_components/bms-reports-list.tsx" "app/reports/_components/bms-draft-links.spec.ts"
git commit -m "fix: open selected BMS draft"
```

---

### Task 5: Guard PJUM And Submit Semantics

**Files:**
- Modify: `app/reports/actions/submit.ts`
- Test: `app/reports/actions/submit-draft-source.spec.ts`
- Test: `app/reports/actions/report-json-helpers.spec.ts`

**Interfaces:**
- Consumes: final submit `DraftData` payload from the current form.
- Produces: final report data from submit payload, never from older autosave.

- [ ] **Step 1: Write source-level submit guard**

Create `app/reports/actions/submit-draft-source.spec.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./submit.ts", import.meta.url), "utf8");

assert.match(
    source,
    /const itemsJson = buildItemsJson\(\{ \.\.\.data, checklistItems \}\)/,
    "submit must build final items from the incoming submit payload",
);

assert.match(
    source,
    /status: initialStatus/,
    "promoted drafts must leave DRAFT status during submit",
);

console.log("submit draft source assertion passed");
```

- [ ] **Step 2: Run current regression tests**

```powershell
npx tsx "app/reports/actions/submit-draft-source.spec.ts"
npx tsx "app/reports/actions/report-json-helpers.spec.ts"
```

Expected: PASS. If `report-json-helpers.spec.ts` does not exist in this checkout, create the specific test in Step 3 before running it.

- [ ] **Step 3: Add explicit BMS handler clearing test if missing**

If `app/reports/actions/report-json-helpers.spec.ts` does not already assert this, add:

```ts
import assert from "node:assert/strict";
import { buildItemsJson } from "./report-json-helpers";

const items = buildItemsJson({
    storeCode: "A08",
    checklistItems: [
        {
            itemId: "A1",
            itemName: "Bahu Jalan",
            categoryName: "A. Bangunan",
            condition: "BAIK",
            handler: "BMS",
            notes: "old damaged note",
            ahoTicketNumber: "AHO-1",
        },
    ],
    bmsEstimations: {
        A1: [
            {
                itemName: "Semen",
                quantity: 1,
                unit: "sak",
                price: 50000,
                totalPrice: 50000,
            },
        ],
    },
} as never) as Array<Record<string, unknown>>;

assert.equal(items[0]?.condition, "BAIK");
assert.equal(items[0]?.handler, undefined);
assert.equal(items[0]?.notes, undefined);
assert.equal(items[0]?.ahoTicketNumber, undefined);

console.log("report json helper tests passed");
```

- [ ] **Step 4: Confirm PJUM queries ignore DRAFT**

Scan:

```powershell
rg "DRAFT|COMPLETED|pjum|Pjum" app lib -n
```

Expected: PJUM creation/export/approval paths should use completed/final statuses or report numbers selected after completion. Do not add DRAFT to PJUM status lists.

- [ ] **Step 5: Commit**

```powershell
git add "app/reports/actions/submit-draft-source.spec.ts" "app/reports/actions/report-json-helpers.spec.ts"
git commit -m "test: guard draft submit semantics"
```

---

### Task 6: Documentation, Verification, And Agent Note

**Files:**
- Modify: `docs/project/04-workflows.md`
- Modify: `docs/project/05-routes-and-ui.md`
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-hybrid-server-draft.md`

**Interfaces:**
- Consumes: implemented behavior from Tasks 1-5.
- Produces: canonical docs and task note.

- [ ] **Step 1: Update workflow docs**

In `docs/project/04-workflows.md`, add under `Laporan Maintenance`:

```md
Draft BMS memakai hybrid persistence:

- localStorage menyimpan perubahan kecil dengan cepat untuk device yang sama.
- Server menyimpan DRAFT report pada checkpoint penting, idle 17 detik, upload foto, perpindahan step, page leave best-effort, dan submit.
- Submit selalu memakai payload form terbaru sebagai sumber final.
- Status `DRAFT` tidak dihitung untuk PJUM, realisasi, approval, export final, atau dashboard keuangan.
```

- [ ] **Step 2: Update routes/UI docs**

In `docs/project/05-routes-and-ui.md`, add under `Route Utama` or `Mobile`:

```md
Klik laporan status `DRAFT` dari `/reports` membuka `/reports/create?restore=1&draft=<reportNumber>` agar draft yang dipilih bisa dilanjutkan. Jika localStorage lebih baru di device yang sama, localStorage dipakai; jika tidak ada localStorage, draft server dipakai agar bisa dilanjutkan dari device lain.
```

- [ ] **Step 3: Create agent note**

Create `docs/agent-notes/YYYY-MM-DD-HHMM-hybrid-server-draft.md` with:

```md
# Hybrid Server Draft

## Scope

Implemented hybrid server draft persistence for BMS report creation so DRAFT rows can be resumed from the report list and from another device.

## Context and Sources

- `AI_RULES.md`
- `docs/project/04-workflows.md`
- `docs/project/05-routes-and-ui.md`
- `app/reports/(bms)/create`
- `app/reports/actions`
- Initial bug: DRAFT rows appeared in `/reports` but clicking them opened create without restoring the selected draft.

## Changed Files

- `app/reports/actions/types.ts`: added relaxed autosave validation.
- `app/reports/actions/draft.ts`: added server draft save/restore actions.
- `app/reports/(bms)/create/page.tsx`: loads selected server draft for restore.
- `app/reports/(bms)/create/hooks/use-draft.ts`: chooses between local and server draft sources.
- `app/reports/(bms)/create/hooks/use-server-draft-autosave.ts`: added hybrid autosave scheduling.
- `app/reports/(bms)/create/hooks/use-photo-upload.ts`: flushes after successful photo upload.
- `app/reports/(bms)/create/create-form.tsx`: flushes on step/store/checkpoint changes.
- `app/reports/_components/bms-reports-mobile.tsx`: links DRAFT rows to the clicked draft.
- `app/reports/_components/bms-reports-list.tsx`: links DRAFT row/actions to the clicked draft.
- `docs/project/04-workflows.md`: documented hybrid draft behavior.
- `docs/project/05-routes-and-ui.md`: documented DRAFT restore route behavior.

## Decisions

- localStorage remains the fastest same-device draft cache.
- Server autosave is checkpoint/idle based, with 17-second idle delay, to avoid excessive traffic.
- Submit payload remains the final source of truth.
- `DRAFT` reports remain excluded from PJUM and finance workflows.

## Verification

- `npx tsx app/reports/actions/draft-autosave-schema.spec.ts`
- `npx tsx app/reports/(bms)/create/hooks/use-draft-source.spec.ts`
- `npx tsx app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts`
- `npx tsx app/reports/_components/bms-draft-links.spec.ts`
- `npx tsx app/reports/actions/submit-draft-source.spec.ts`
- `npm run check:agent-note`

## Remaining Work and Risks

None.
```

- [ ] **Step 4: Run final verification**

```powershell
npx tsx "app/reports/actions/draft-autosave-schema.spec.ts"
npx tsx "app/reports/(bms)/create/hooks/use-draft-source.spec.ts"
npx tsx "app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts"
npx tsx "app/reports/_components/bms-draft-links.spec.ts"
npx tsx "app/reports/actions/submit-draft-source.spec.ts"
npm run check:agent-note
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```powershell
git add "docs/project/04-workflows.md" "docs/project/05-routes-and-ui.md" "docs/agent-notes"
git commit -m "docs: document hybrid BMS drafts"
```

---

## Self-Review

- Spec coverage: The plan covers the original `/reports` DRAFT click bug, cross-device restore, hybrid low-traffic autosave, 17-second idle autosave, photo reference-only saves, submit-as-final-source, and PJUM/realisasi exclusion for DRAFT rows.
- Placeholder scan: Passed; the plan contains no unfinished placeholder steps.
- Type consistency: `DraftData`, `SerializedDraft`, `saveServerDraft`, `getDraftByReportNumber`, `chooseDraftSource`, and `useServerDraftAutosave` are introduced before later tasks consume them.
