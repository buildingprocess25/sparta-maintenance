# Plan: Status Baru `PENDING_CHECKLIST_REVIEW` + Alur Approval Checklist-Only

> **For agentic workers:** Gunakan skill `single-flow-task-execution`. Kerjakan satu task pada satu waktu, verifikasi sebelum lanjut. Jangan mulai eksekusi sampai user memberikan order.

**Goal 1 — Status Baru:** Laporan yang tidak memiliki item dengan handler BMS (murni checklist atau semua kerusakan ditangani Rekanan) tidak lagi menampilkan label "Review Estimasi" yang misleading, melainkan "Review Checklist".

**Goal 2 — Alur Approval Baru:** Laporan bertipe checklist-only mengikuti alur yang diperpendek:
```
BMS Submit → PENDING_CHECKLIST_REVIEW
  ↓ BMC Approve
APPROVED_BMC  (lompat, skip ESTIMATION_APPROVED → IN_PROGRESS → PENDING_REVIEW)
  ↓ BNM Approve
COMPLETED
```

**Definisi "Checklist-Only Report":**
Laporan dianggap checklist-only jika **tidak ada satu pun item** di dalam `items` JSON yang memiliki `handler === "BMS"`. Ini mencakup:
1. Laporan murni checklist rutin (semua item OK/TIDAK_ADA, tidak ada handler).
2. Ada kerusakan, tapi **seluruhnya** ditangani Rekanan (`handler === "REKANAN"`).

**Keputusan Desain:**
- `isRekananZeroCost` **dipertahankan** sebagai safety net untuk laporan `PENDING_ESTIMATION` (laporan lama atau edge case yang mungkin lolos).
- Untuk laporan baru bertipe `PENDING_CHECKLIST_REVIEW`, bypass ke `APPROVED_BMC` langsung dilakukan berdasarkan statusnya — tanpa perlu re-evaluate `isRekananZeroCost`.

**Cakupan & Dampak Perubahan:**
- ✅ Database schema (`prisma/schema.prisma`)
- ✅ Helper status (`lib/report-status.ts`)
- ✅ Helper util (`lib/report-utils.ts`)
- ✅ Action submit (`app/reports/actions/submit.ts`)
- ✅ Action resubmit (`app/reports/actions/resubmit.ts`)
- ✅ Action approve-estimation (`app/reports/actions/approve-estimation.ts`)
- ✅ Notifikasi (`lib/notifications/types.ts`, `dispatch.ts`, `templates.ts`)
- ✅ Dashboard & reports queries (5 file)
- ✅ UI Components (10 file)
- ✅ Task note

---

## Task 1: Migrasi Database — Tambah Enum Value

**File:** `prisma/schema.prisma`

Tambah `PENDING_CHECKLIST_REVIEW` ke enum `ReportStatus`, posisikan setelah `PENDING_ESTIMATION`:

```prisma
enum ReportStatus {
  DRAFT
  PENDING_ESTIMATION
  PENDING_CHECKLIST_REVIEW   // ← NEW
  ESTIMATION_APPROVED
  ...
}
```

Kemudian jalankan:
```bash
npx prisma migrate dev --name add_pending_checklist_review_status
npx prisma generate
```

- [ ] Tambah `PENDING_CHECKLIST_REVIEW` di enum `ReportStatus`
- [ ] Jalankan `npx prisma migrate dev --name add_pending_checklist_review_status`
- [ ] Jalankan `npx prisma generate`

---

## Task 2: Daftarkan Status di Helper Pusat

**File:** `lib/report-status.ts`

```typescript
// REPORT_STATUS_LABELS
PENDING_CHECKLIST_REVIEW: "Review Checklist",

// REPORT_STATUS_ORDER — setelah PENDING_ESTIMATION
"PENDING_ESTIMATION",
"PENDING_CHECKLIST_REVIEW",
"ESTIMATION_APPROVED",
...

// REPORT_STATUS_BADGE_CLASS — warna teal untuk membedakan dari kuning (PENDING_ESTIMATION)
PENDING_CHECKLIST_REVIEW: "bg-teal-100 text-teal-800 hover:bg-teal-100/80",

// REPORT_STATUS_SLUGS
pending_checklist_review: "PENDING_CHECKLIST_REVIEW",
```

- [ ] Tambah `PENDING_CHECKLIST_REVIEW` ke semua map/array di `lib/report-status.ts`

---

## Task 3: Tambah Fungsi Helper `isChecklistOnlyReport`

**File:** `lib/report-utils.ts`

```typescript
/**
 * Returns true when a report is "checklist-only":
 * no items have handler === "BMS".
 * Covers both pure-checklist reports (no damage) and reports where
 * all damaged items are handled entirely by REKANAN.
 *
 * Reports matching this condition follow the fast-track approval flow:
 *   PENDING_CHECKLIST_REVIEW → APPROVED_BMC → COMPLETED
 * instead of the full BMS work stages.
 */
export function isChecklistOnlyReport(items: ReportItemJson[]): boolean {
    return !items.some((item) => item.handler === "BMS");
}
```

- [ ] Tambah fungsi `isChecklistOnlyReport` ke `lib/report-utils.ts`

---

## Task 4: Update Action Submit

**File:** `app/reports/actions/submit.ts`

Setelah `buildItemsJson` dipanggil, evaluasi `isChecklistOnlyReport` dan tentukan status awal:

```typescript
import { isRekananZeroCost, isChecklistOnlyReport } from "@/lib/report-utils";
import type { ReportItemJson } from "@/types/report";
// ...

const itemsJson = buildItemsJson({ ...data, checklistItems });

// Determine the correct initial status based on items content
const submittedItems = itemsJson as unknown as ReportItemJson[];
const initialStatus = isChecklistOnlyReport(submittedItems)
    ? "PENDING_CHECKLIST_REVIEW"
    : "PENDING_ESTIMATION";

// In tx.report.create:
status: initialStatus,
```

- [ ] Import `isChecklistOnlyReport` dan `ReportItemJson` di `submit.ts`
- [ ] Evaluasi `initialStatus` berdasarkan `isChecklistOnlyReport`
- [ ] Gunakan `initialStatus` di `tx.report.create`

---

## Task 5: Update Action Resubmit

**File:** `app/reports/actions/resubmit.ts`

Ketika BMS merevisi dari `ESTIMATION_REJECTED_REVISION`, re-evaluasi apakah laporan yang telah direvisi masih checklist-only atau tidak:

```typescript
import { isChecklistOnlyReport } from "@/lib/report-utils";
import type { ReportItemJson } from "@/types/report";
// ...

const itemsJson = buildItemsJson(data);

const revisedItems = itemsJson as unknown as ReportItemJson[];
const newStatus =
    currentStatus === "REVIEW_REJECTED_REVISION"
        ? "PENDING_REVIEW"
        : isChecklistOnlyReport(revisedItems)
          ? "PENDING_CHECKLIST_REVIEW"
          : "PENDING_ESTIMATION";
```

- [ ] Import `isChecklistOnlyReport` dan `ReportItemJson` di `resubmit.ts`
- [ ] Ubah logika `newStatus` agar re-evaluate ketika kembali dari `ESTIMATION_REJECTED_REVISION`

---

## Task 6: Update Action Approve-Estimation (Inti Alur Baru)

**File:** `app/reports/actions/approve-estimation.ts`

Ini adalah perubahan paling krusial. Ada dua perubahan utama:

**6a. Perluas validasi status:**
```typescript
const REVIEWABLE_STATUSES = [
    ReportStatus.PENDING_ESTIMATION,
    ReportStatus.PENDING_CHECKLIST_REVIEW,
] as const;
type ReviewableStatus = (typeof REVIEWABLE_STATUSES)[number];

if (!REVIEWABLE_STATUSES.includes(report.status as ReviewableStatus)) {
    return {
        error: `Laporan harus berstatus '${getReportStatusLabel("PENDING_ESTIMATION")}' atau '${getReportStatusLabel("PENDING_CHECKLIST_REVIEW")}'`,
    };
}
```

**6b. Logika penentuan `newStatus` — implementasi alur approval baru:**
```typescript
const isChecklistReport = report.status === ReportStatus.PENDING_CHECKLIST_REVIEW;

// isRekananZeroCost dipertahankan sebagai safety net untuk PENDING_ESTIMATION
const isRekananBypass =
    decision === "approve" && !isChecklistReport && isRekananZeroCost(items, estimations);

const newStatus = isChecklistReport && decision === "approve"
    // Checklist-only: BMC approve → langsung APPROVED_BMC (skip BMS work stages)
    ? ReportStatus.APPROVED_BMC
    : isRekananBypass
    // Rekanan safety net: semua rusak dihandle Rekanan → langsung APPROVED_BMC
    ? ReportStatus.APPROVED_BMC
    : decision === "approve"
    ? ReportStatus.ESTIMATION_APPROVED
    : decision === "reject_revision"
    ? ReportStatus.ESTIMATION_REJECTED_REVISION
    : ReportStatus.ESTIMATION_REJECTED;
```

**6c. Perbarui `where` clause di `prisma.report.update`:**
```typescript
prisma.report.update({
    where: {
        reportNumber,
        status: { in: [ReportStatus.PENDING_ESTIMATION, ReportStatus.PENDING_CHECKLIST_REVIEW] },
    },
    data: { status: newStatus },
}),
```

**6d. Notifikasi tambahan untuk checklist bypass:**
Sama seperti Rekanan bypass, ketika laporan checklist-only di-approve oleh BMC dan masuk ke `APPROVED_BMC`, kirim notifikasi `REPORT_WORK_APPROVED` ke BNM agar mereka tahu ada laporan yang perlu di-review final:
```typescript
if (isChecklistReport && decision === "approve") {
    dispatchNotificationEvent({
        type: "REPORT_WORK_APPROVED",
        actorNIK: user.NIK,
        reportNumber,
        notes: logNote,
    });
}
```

- [ ] Tambah `REVIEWABLE_STATUSES` dan perluas validasi status
- [ ] Tambah variable `isChecklistReport` berdasarkan `report.status`
- [ ] Ubah logika `newStatus` sesuai skema di atas
- [ ] Perbarui `where` clause di `prisma.report.update`
- [ ] Tambah dispatch notifikasi `REPORT_WORK_APPROVED` untuk checklist bypass

---

## Task 7: Update Notifikasi

**File:** `lib/notifications/types.ts`, `dispatch.ts`, `templates.ts`

**`types.ts`** — tambah field opsional ke context:
```typescript
export type NotificationTemplateContext = {
    // ... existing fields
    isChecklistOnly?: boolean; // NEW — untuk menyesuaikan teks notifikasi
};
```

**`dispatch.ts`** — saat `REPORT_SUBMITTED`, sertakan `isChecklistOnly`:
Di `dispatchReportNotification`, setelah fetch report, fetch statusnya dan kirim ke context:
```typescript
// Fetch status untuk menentukan tipe laporan
const report = await prisma.report.findUnique({
    where: { reportNumber: input.reportNumber },
    select: { ..., status: true },  // tambah status
});
// ...
await createAndPushNotifications({
    // ...
    isChecklistOnly: report.status === "PENDING_CHECKLIST_REVIEW",
});
```

**`templates.ts`** — sesuaikan teks notifikasi:
```typescript
case "REPORT_SUBMITTED":
    return {
        ...base,
        title: context.isChecklistOnly
            ? "Laporan baru menunggu review checklist"
            : "Laporan baru menunggu review estimasi",
        body: `${reportLabel(report)} perlu dicek oleh BMC.`,
    };
```

- [ ] Tambah `isChecklistOnly?: boolean` ke `NotificationTemplateContext` di `types.ts`
- [ ] Fetch `status` di `dispatchReportNotification` dan kirim `isChecklistOnly`
- [ ] Update teks di `templates.ts` untuk case `REPORT_SUBMITTED`

---

## Task 8: Update Dashboard & Reports Queries

Semua query yang menggunakan `"PENDING_ESTIMATION"` untuk konteks "laporan yang harus direview BMC" harus ditambahkan `"PENDING_CHECKLIST_REVIEW"`.

**`app/dashboard/queries.ts`:**
- `getBMCStats` → `needsReview: in: ["PENDING_ESTIMATION", "PENDING_REVIEW"]` → tambah `"PENDING_CHECKLIST_REVIEW"`
- `getManagerPriorityStatuses` → return untuk BMC → tambah `"PENDING_CHECKLIST_REVIEW"`
- Semua `in: ["PENDING_ESTIMATION", "PENDING_REVIEW"]` untuk konteks BMC

**`app/reports/actions/queries.ts`:**
- `defaultStatuses` untuk BMC: `["PENDING_ESTIMATION", "PENDING_REVIEW"]` → tambah `"PENDING_CHECKLIST_REVIEW"`
- `ALL_NON_DRAFT_STATUSES` → tambah `"PENDING_CHECKLIST_REVIEW"`

**`app/dashboard/reports/actions.ts`:**
- Array status untuk BMC → tambah `"PENDING_CHECKLIST_REVIEW"`

- [ ] Update semua BMC-facing status filter di `app/dashboard/queries.ts`
- [ ] Update `app/reports/actions/queries.ts`
- [ ] Update `app/dashboard/reports/actions.ts`

---

## Task 9: Update Reports Page Group Filters

**File:** `app/reports/page.tsx`

```typescript
const BMS_WAITING_REVIEW = [
    "PENDING_ESTIMATION",
    "PENDING_CHECKLIST_REVIEW",  // ← NEW
    "PENDING_REVIEW",
    "APPROVED_BMC",
];
```

- [ ] Tambah `"PENDING_CHECKLIST_REVIEW"` ke `BMS_WAITING_REVIEW`

---

## Task 10: Update Semua Komponen UI

### `app/reports/_components/approval-reports-list.tsx`
- Badge switch-case → tambah `case "PENDING_CHECKLIST_REVIEW"` dengan badge warna teal
- `getActionLabel` → `PENDING_CHECKLIST_REVIEW` → `"Review Checklist"`
- Filter `<SelectItem>` dropdown → tambah option `pending_checklist_review` / "Review Checklist"
- Peta warna grafik → tambah entry `PENDING_CHECKLIST_REVIEW: "bg-teal-400"`

### `app/reports/_components/bms-reports-list.tsx`
- Badge switch-case → tambah case (warna teal)
- Map progress step → tambah `PENDING_CHECKLIST_REVIEW` sejajar dengan `PENDING_ESTIMATION`
- Filter `<SelectItem>` dropdown → tambah option

### `app/reports/_components/bms-reports-mobile.tsx`
- Map `STATUS_CONFIG` → tambah entri untuk `PENDING_CHECKLIST_REVIEW`

### `app/reports/_components/bms-mobile-reports-list.tsx`
- Array status filter → tambah `"PENDING_CHECKLIST_REVIEW"`

### `app/reports/pjum/_components/pjum-view.tsx`
- Peta warna & label → tambah entry `PENDING_CHECKLIST_REVIEW`

### `app/dashboard/_components/admin/admin-new-dashboard.tsx`
- Peta warna grafik → tambah `PENDING_CHECKLIST_REVIEW: "bg-teal-400"`

### `app/dashboard/reports/[reportNumber]/_components/report-approval-actions.tsx`
- `getApprovalConfig` → tambah `case "PENDING_CHECKLIST_REVIEW"` dengan config yang **disesuaikan**:
  - Tombol "Setujui estimasi" → ganti teks jadi **"Setujui checklist"**
  - Dialog description → "BMS tidak perlu melakukan pekerjaan. Laporan akan diteruskan ke BNM untuk approval final."
  - Tombol reject/revision tetap tersedia (BMC masih bisa menolak/minta revisi)

### `app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts`
- Kondisi `status === "PENDING_ESTIMATION"` → tambah `|| status === "PENDING_CHECKLIST_REVIEW"`

### `app/dashboard/reports/[reportNumber]/page.tsx`
- Kondisi `status === "PENDING_ESTIMATION"` → tambah OR untuk status baru

### `app/dashboard/settings/_components/settings-workbench.tsx`
- Array/switch status → tambah `"PENDING_CHECKLIST_REVIEW"`

- [ ] Update `approval-reports-list.tsx`
- [ ] Update `bms-reports-list.tsx`
- [ ] Update `bms-reports-mobile.tsx`
- [ ] Update `bms-mobile-reports-list.tsx`
- [ ] Update `pjum-view.tsx`
- [ ] Update `admin-new-dashboard.tsx`
- [ ] Update `report-approval-actions.tsx` (dengan teks tombol yang disesuaikan)
- [ ] Update `report-detail-utils.ts`
- [ ] Update `app/dashboard/reports/[reportNumber]/page.tsx`
- [ ] Update `settings-workbench.tsx`

---

## Task 11: Verifikasi & Task Note

**TypeScript check:**
```bash
npx tsc --noEmit
```

**Manual test end-to-end:**
- [ ] Buat laporan checklist-only (tidak ada handler BMS) → status harus `PENDING_CHECKLIST_REVIEW`, label "Review Checklist"
- [ ] Buat laporan dengan handler BMS → status harus `PENDING_ESTIMATION`, label "Review Estimasi"
- [ ] Login sebagai BMC → kedua laporan muncul di antrian review
- [ ] BMC approve laporan `PENDING_CHECKLIST_REVIEW` → langsung lompat ke `APPROVED_BMC` (tidak ke `ESTIMATION_APPROVED`)
- [ ] Login BNM → laporan muncul di antrian BNM → approve → status `COMPLETED`
- [ ] Notifikasi BMC untuk laporan checklist → "menunggu review checklist"
- [ ] Laporan `PENDING_ESTIMATION` dengan Rekanan bypass tetap berfungsi (safety net)

- [ ] Buat task note di `docs/agent-notes/YYYY-MM-DD-HHMM-pending-checklist-review.md`
