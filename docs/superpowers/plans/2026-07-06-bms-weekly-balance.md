# BMS Weekly Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan kontrol saldo BMS Rp 1.000.000 berbasis ledger, blokir estimasi over saldo, blokir pekerjaan saat PJUM Review BNM, dan reset saldo saat PJUM approved.

**Architecture:** Tambahkan ledger `BmsBalanceEntry`, helper saldo di `lib/bms-balance.ts`, lalu panggil helper dari submit estimasi, start work, completion, PJUM create, dan PJUM approval. UI cukup menampilkan status saldo di titik keputusan.

**Tech Stack:** Next.js Server Actions, Prisma 7, PostgreSQL, TypeScript, shadcn/ui existing components.

## Global Constraints

- Jangan menambah dependency baru.
- Jangan menjalankan `prisma migrate deploy`.
- Saldo hanya menghitung item rusak handler `BMS`.
- Estimasi over saldo harus diblok.
- Realisasi over saldo boleh submit dengan catatan wajib.
- PJUM `PENDING_APPROVAL` mengunci BMS dari mulai pekerjaan baru.
- PJUM approved reset saldo ke Rp 1.000.000.
- PJUM rejected membatalkan reset.

---

### Task 1: Add Balance Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_bms_balance_entries/migration.sql`

**Interfaces:**
- Produces: `BmsBalanceEntry`, `BmsBalanceEntryType`.

- [ ] **Step 1: Update Prisma schema**

Add:

```prisma
enum BmsBalanceEntryType {
  ESTIMATE_RESERVED
  REALIZATION_ADJUSTMENT
  RESERVE_RELEASED
  PJUM_LOCKED
  PJUM_APPROVED_RESET
  PJUM_REJECTED_RESET_REVERTED
  ADMIN_ADJUSTMENT
}

model BmsBalanceEntry {
  id           String              @id @default(uuid())
  bmsNIK       String
  branchName   String
  areaName     String?
  reportNumber String?
  pjumExportId String?
  periodStart  DateTime            @db.Date
  type         BmsBalanceEntryType
  amount       Decimal             @db.Decimal(15, 2)
  notes        String?
  actorNIK     String?
  createdAt    DateTime            @default(now()) @db.Timestamptz(3)

  @@index([bmsNIK, periodStart])
  @@index([reportNumber])
  @@index([pjumExportId])
}
```

- [ ] **Step 2: Create migration**

Run:

```bash
npx prisma migrate dev --create-only --name add_bms_balance_entries
```

Expected: migration SQL created, database not deployed to production.

- [ ] **Step 3: Generate Prisma client**

Run:

```bash
npm run db:generate
```

Expected: Prisma Client generated.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add bms balance ledger schema"
```

---

### Task 2: Add Balance Helper

**Files:**
- Create: `lib/bms-balance.ts`
- Create: `lib/bms-balance.spec.ts`

**Interfaces:**
- Produces: `BMS_WEEKLY_BALANCE_LIMIT`, `getBmsBalanceState`, `assertCanUseBalance`, `sumBmsWorkCost`.

- [ ] **Step 1: Add helper**

Create `lib/bms-balance.ts`:

```ts
import { Prisma } from "@prisma/client";

export const BMS_WEEKLY_BALANCE_LIMIT = 1_000_000;

type WorkItem = {
    handler?: string | null;
    condition?: string | null;
    totalPrice?: number | null;
    actualCost?: number | null;
    realisasiItems?: Array<{ totalPrice?: number | null; quantity?: number; price?: number }>;
};

function toNumber(value: unknown) {
    if (value instanceof Prisma.Decimal) return value.toNumber();
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function sumBmsWorkCost(items: unknown, mode: "estimate" | "realization") {
    if (!Array.isArray(items)) return 0;

    return items.reduce((sum, item: WorkItem) => {
        if (item.handler !== "BMS") return sum;
        if (item.condition && item.condition !== "RUSAK") return sum;

        if (mode === "estimate") return sum + toNumber(item.totalPrice);

        const realisasiTotal = (item.realisasiItems ?? []).reduce(
            (subtotal, row) =>
                subtotal + toNumber(row.totalPrice ?? (row.quantity ?? 0) * (row.price ?? 0)),
            0,
        );

        return sum + toNumber(item.actualCost ?? realisasiTotal);
    }, 0);
}

export function getAvailableBalance(used: number) {
    return BMS_WEEKLY_BALANCE_LIMIT - used;
}

export function assertCanUseBalance(params: { requested: number; used: number }) {
    const available = getAvailableBalance(params.used);
    if (params.requested > available) {
        throw new Error(
            `Estimasi melebihi saldo BMS. Sisa saldo saat ini Rp ${available.toLocaleString("id-ID")}.`,
        );
    }
}
```

- [ ] **Step 2: Add spec**

Create `lib/bms-balance.spec.ts`:

```ts
import assert from "node:assert/strict";
import { assertCanUseBalance, sumBmsWorkCost } from "./bms-balance";

const items = [
    { handler: "BMS", condition: "RUSAK", totalPrice: 100_000 },
    { handler: "REKANAN", condition: "RUSAK", totalPrice: 900_000 },
    { handler: "BMS", condition: "BAIK", totalPrice: 500_000 },
];

assert.equal(sumBmsWorkCost(items, "estimate"), 100_000);
assert.doesNotThrow(() => assertCanUseBalance({ requested: 100_000, used: 800_000 }));
assert.throws(
    () => assertCanUseBalance({ requested: 300_000, used: 800_000 }),
    /Estimasi melebihi saldo BMS/,
);
```

- [ ] **Step 3: Run spec**

Run:

```bash
npx tsx lib/bms-balance.spec.ts
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add lib/bms-balance.ts lib/bms-balance.spec.ts
git commit -m "feat: add bms balance helper"
```

---

### Task 3: Block Over-Balance Estimation

**Files:**
- Modify: `app/reports/actions/submit.ts` or actual submit estimation action file found by `rg -n "totalEstimation|PENDING_ESTIMATION" app/reports app/dashboard`

**Interfaces:**
- Consumes: `assertCanUseBalance`, `sumBmsWorkCost`.
- Produces: server-side validation error before report enters estimation review.

- [ ] **Step 1: Locate submit estimation action**

Run:

```bash
rg -n "PENDING_ESTIMATION|totalEstimation|buildEstimationsJson" app/reports app/dashboard
```

Expected: exact action file identified.

- [ ] **Step 2: Add validation before save**

Use current report payload items and current BMS balance usage:

```ts
const requested = sumBmsWorkCost(itemsPayload, "estimate");
const used = await getCurrentBmsBalanceUsage({
    bmsNIK: user.NIK,
    tx: prisma,
});
assertCanUseBalance({ requested, used });
```

If `getCurrentBmsBalanceUsage` is added in Task 2 implementation, keep it in `lib/bms-balance.ts`.

- [ ] **Step 3: Run targeted checks**

Run:

```bash
npx tsx lib/bms-balance.spec.ts
npx tsc --noEmit
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add app/reports lib/bms-balance.ts lib/bms-balance.spec.ts
git commit -m "feat: block bms estimation over balance"
```

---

### Task 4: Reserve Balance on Start Work and Block Pending PJUM

**Files:**
- Modify: `app/reports/actions/start-work.ts` or actual start-work action found by `rg -n "WORK_STARTED|IN_PROGRESS|startReceiptUrls" app/reports`

**Interfaces:**
- Consumes: `BmsBalanceEntry`, `sumBmsWorkCost`.
- Produces: start work blocked when BMS has PJUM `PENDING_APPROVAL`; reserve entry when work starts.

- [ ] **Step 1: Locate start-work action**

Run:

```bash
rg -n "WORK_STARTED|IN_PROGRESS|startReceiptUrls" app/reports
```

- [ ] **Step 2: Add pending PJUM block**

Before status update:

```ts
const pendingPjum = await tx.pjumExport.findFirst({
    where: { bmsNIK: user.NIK, status: "PENDING_APPROVAL" },
    select: { id: true },
});

if (pendingPjum) {
    throw new Error("Saldo BMS sedang terkunci karena PJUM masih Review BNM.");
}
```

- [ ] **Step 3: Add reserve entry**

After report is moved to `IN_PROGRESS`:

```ts
await tx.bmsBalanceEntry.create({
    data: {
        bmsNIK: user.NIK,
        branchName: report.branchName,
        areaName: report.areaName,
        reportNumber: report.reportNumber,
        periodStart: new Date(),
        type: "ESTIMATE_RESERVED",
        amount: new Prisma.Decimal(sumBmsWorkCost(report.items, "estimate")),
        actorNIK: user.NIK,
    },
});
```

- [ ] **Step 4: Run checks**

```bash
npx tsx lib/bms-balance.spec.ts
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/reports lib/bms-balance.ts
git commit -m "feat: reserve bms balance on start work"
```

---

### Task 5: Require Notes for Over-Balance Realization

**Files:**
- Modify: `app/reports/actions/submit-completion-work.ts`
- Modify: completion form file found by `rg -n "completionNotes|submit penyelesaian|realisasi" app/reports`

**Interfaces:**
- Consumes: `sumBmsWorkCost`.
- Produces: required unexpected-cost note when realization exceeds balance.

- [ ] **Step 1: Add server validation**

In completion submit action:

```ts
const realCost = sumBmsWorkCost(updatedItems, "realization");
const estimatedCost = sumBmsWorkCost(report.items, "estimate");
const overBudget = realCost > estimatedCost;

if (overBudget && !completion.unexpectedCostNotes?.trim()) {
    throw new Error("Catatan biaya tak terduga wajib diisi karena realisasi melebihi estimasi.");
}
```

- [ ] **Step 2: Add adjustment entry**

```ts
await tx.bmsBalanceEntry.create({
    data: {
        bmsNIK: report.createdByNIK,
        branchName: report.branchName,
        areaName: report.areaName,
        reportNumber: report.reportNumber,
        periodStart,
        type: "REALIZATION_ADJUSTMENT",
        amount: new Prisma.Decimal(realCost - estimatedCost),
        notes: completion.unexpectedCostNotes?.trim() || null,
        actorNIK: user.NIK,
    },
});
```

- [ ] **Step 3: Update UI copy**

Show note field only when realisasi exceeds estimation:

```text
Realisasi melebihi estimasi. Isi alasan biaya tak terduga sebelum submit.
```

- [ ] **Step 4: Run checks**

```bash
npx tsx lib/bms-balance.spec.ts
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/reports lib/bms-balance.ts
git commit -m "feat: require notes for over balance realization"
```

---

### Task 6: Make PJUM Strict for Active Reports and Balance Lock

**Files:**
- Modify: `app/dashboard/pjum/actions.ts`
- Modify: `app/dashboard/pjum/_components/create-pjum-dialog.tsx`

**Interfaces:**
- Consumes: existing `unfinishedCount`.
- Produces: PJUM creation blocked when unfinished reports exist; warning about saldo lock.

- [ ] **Step 1: Block create when unfinished exists**

In `createDashboardPjum`, after loading `reports`:

```ts
const unfinishedReports = reports.filter((report) => report.status !== "COMPLETED");
if (unfinishedReports.length > 0) {
    return {
        error: `Masih ada ${unfinishedReports.length} laporan minggu ini yang belum selesai. Minta BMS menyelesaikan laporan sebelum PJUM dibuat.`,
        pjumExportId: null,
    };
}
```

- [ ] **Step 2: Block duplicate pending PJUM for BMS**

```ts
const pendingPjumForBms = await prisma.pjumExport.findFirst({
    where: { bmsNIK, status: "PENDING_APPROVAL" },
    select: { id: true },
});

if (pendingPjumForBms) {
    return {
        error: "BMS ini masih memiliki PJUM Review BNM. Saldo belum bisa di-reset.",
        pjumExportId: null,
    };
}
```

- [ ] **Step 3: Add dialog warning**

In `CreatePjumDialog`, show:

```tsx
<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
    Setelah PJUM dibuat, saldo BMS akan terkunci sampai BNM menyetujui atau menolak PJUM ini. BMS tidak bisa mulai pekerjaan baru selama PJUM masih Review BNM.
</div>
```

- [ ] **Step 4: Disable create when unfinished exists**

```ts
const canCreate =
    selectedReports.length > 0 &&
    !isCreating &&
    !isSearching &&
    !!result &&
    result.unfinishedCount === 0;
```

- [ ] **Step 5: Run checks**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/pjum/actions.ts app/dashboard/pjum/_components/create-pjum-dialog.tsx
git commit -m "feat: enforce strict pjum balance lock"
```

---

### Task 7: Reset or Revert Balance on PJUM Decision

**Files:**
- Modify: `app/dashboard/pjum/[id]/_components/pjum-approval-button.tsx` if client action needed
- Modify: actual PJUM approval action found by `rg -n "PJUM_APPROVED|APPROVED|pjumFinalDriveUrl|approvedAt" app lib`

**Interfaces:**
- Produces: `PJUM_APPROVED_RESET` entry on approval; `PJUM_REJECTED_RESET_REVERTED` entry on rejection.

- [ ] **Step 1: Locate PJUM approval action**

Run:

```bash
rg -n "PJUM_APPROVED|PJUM_REJECTED|approvedAt|pjumFinalDriveUrl" app lib
```

- [ ] **Step 2: Add approved reset entry**

When PJUM status becomes `APPROVED`:

```ts
await tx.bmsBalanceEntry.create({
    data: {
        bmsNIK: pjum.bmsNIK,
        branchName: pjum.branchName,
        areaName: pjum.areaNames[0] ?? null,
        pjumExportId: pjum.id,
        periodStart: new Date(),
        type: "PJUM_APPROVED_RESET",
        amount: new Prisma.Decimal(0),
        actorNIK: user.NIK,
    },
});
```

- [ ] **Step 3: Add rejected reset revert entry**

When PJUM status becomes `REJECTED`:

```ts
await tx.bmsBalanceEntry.create({
    data: {
        bmsNIK: pjum.bmsNIK,
        branchName: pjum.branchName,
        areaName: pjum.areaNames[0] ?? null,
        pjumExportId: pjum.id,
        periodStart: new Date(),
        type: "PJUM_REJECTED_RESET_REVERTED",
        amount: new Prisma.Decimal(0),
        notes: rejectionNotes,
        actorNIK: user.NIK,
    },
});
```

- [ ] **Step 4: Run checks**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app lib
git commit -m "feat: update bms balance on pjum decision"
```

---

### Task 8: Add Minimal Balance UI

**Files:**
- Modify: `app/dashboard/_components/bms-dashboard.tsx`
- Modify: `app/reports/(bms)/start-work/start-work-form.tsx`
- Modify: `app/dashboard/reports/[reportNumber]/_components/report-header.tsx`
- Modify: `app/dashboard/pjum/[id]/page.tsx`

**Interfaces:**
- Consumes: balance helper server data.
- Produces: user-visible balance state.

- [ ] **Step 1: Add BMS dashboard balance summary**

Show:

```text
Saldo tersedia: Rp {available}
Terpakai: Rp {used}
Status: Aktif / Terkunci PJUM
```

- [ ] **Step 2: Add start-work lock message**

If pending PJUM exists:

```text
Saldo BMS sedang terkunci karena PJUM masih Review BNM. Tunggu keputusan BNM sebelum mulai pekerjaan baru.
```

- [ ] **Step 3: Add report detail badge**

Show badge on dashboard report detail:

```text
Saldo BMS
```

Use amber when realization over estimation.

- [ ] **Step 4: Add PJUM detail balance status**

Show:

```text
Saldo BMS terkunci sampai PJUM ini disetujui atau ditolak.
```

- [ ] **Step 5: Run checks**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app
git commit -m "feat: show bms balance status"
```

---

## Self-Review

Spec coverage:

- Estimasi over saldo diblok: Task 3.
- Realisasi over saldo dengan catatan wajib: Task 5.
- PJUM strict jika ada laporan belum selesai: Task 6.
- PJUM pending mengunci pekerjaan baru: Task 4 dan Task 6.
- PJUM approved reset saldo: Task 7.
- PJUM rejected membatalkan reset: Task 7.
- UI minimal: Task 8.

Verification:

- Helper has `tsx` spec.
- App changes use `npx tsc --noEmit`.
- No production migration deploy included.

Plan complete and saved to `docs/superpowers/plans/2026-07-06-bms-weekly-balance.md`. Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks.
2. Inline Execution - execute tasks in this session with checkpoints.

Which approach?
