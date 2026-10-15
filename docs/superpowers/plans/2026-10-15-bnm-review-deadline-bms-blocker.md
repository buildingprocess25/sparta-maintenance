# BNM Review Deadline & BMS Blocker Relaxation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BMS boleh membuat laporan baru begitu laporan sebelumnya masuk Review BNM (`APPROVED_BMC`); BNM diberi tenggat kalender (cut-off 23:59 WIB) dan, jika terlewat, BMS pemilik laporan diblokir membuat laporan baru.

**Architecture:** Dua helper murni di `lib/` (tenggat berbasis hari kalender Jakarta + pencari laporan lewat tenggat) dipakai oleh dua konsumen: blocker BMS (dihitung saat dibaca, tanpa cron) dan kartu dashboard BNM (label dua tingkat + tooltip). Semuanya dihitung dari jam sekarang saat dibaca, sehingga tidak butuh migrasi database maupun scheduler. Waktu masuk Review BNM diambil dari `ApprovalLog` terakhir berstatus `APPROVED_BMC` (tanpa migrasi kolom).

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 7 / PostgreSQL, shadcn/ui, test berupa spec `node:assert` yang dijalankan dengan `tsx`.

## Global Constraints

- Zona waktu tenggat **selalu `Asia/Jakarta`**, dihitung di server lewat `lib/time.ts`; jangan pakai zona browser/server.
- Rumus tenggat: `deadlineAt` (eksklusif) = 00:00 WIB awal hari ke-`(slaDays + 1)` setelah hari laporan masuk Review BNM. Dengan `slaDays = 1`: masuk Rabu 10:00 → batas Kamis 23:59:59 (`deadlineAt` = Jumat 00:00 WIB). Overdue jika `now >= deadlineAt`.
- Akhir pekan dan hari libur **tidak diperhitungkan** (kalender murni).
- Label peringatan: laporan `APPROVED_BMC` yang sudah **> 24 jam** sejak masuk (rolling, bukan kalender).
- Setting yang dipakai ulang: `report_sla_approved_bmc_days` (default tetap `1`), maknanya kini "hari kalender tambahan, cut-off 23:59 WIB".
- Saldo operasional BMS (`calculateBmsBalance`) **tidak berubah**.
- Tidak ada jalur pelepasan blokir selain BNM memproses laporan (approve atau tolak). Tidak ada override admin.
- Blokir tenggat berlaku "apa pun status laporan terakhir BMS"; 7 status blokir lain (`PENDING_ESTIMATION`, `PENDING_CHECKLIST_REVIEW`, `ESTIMATION_APPROVED`, `ESTIMATION_REJECTED_REVISION`, `IN_PROGRESS`, `PENDING_REVIEW`, `REVIEW_REJECTED_REVISION`) tetap memblokir seperti sekarang.
- **Tanpa notifikasi pengingat** pada tahap ini (tidak ada migrasi enum `NotificationType`, tidak ada endpoint cron). Pengingat berbasis waktu ditunda ke tahap berikutnya.
- Teks pesan memakai bahasa Indonesia dan menyebut "WIB" pada setiap penyebutan jam tenggat.
- Komponen UI: shadcn/ui dulu, jangan menambah padding/margin manual pada komponen shadcn (lihat `AI_RULES.md`).
- Pre-commit hook mewajibkan file `docs/agent-notes/YYYY-MM-DD-HHMM-<task>.md` ikut di-stage pada commit yang mengubah file non-dokumentasi (lihat Task 1 Step 6 dan setiap langkah commit).
- Di luar cakupan (jangan diubah): `lib/notifications/*`, `prisma/schema.prisma`, `app/api/cron/*`, indikator SLA admin (`getAdminStuckReports`, `buildOverdueWhere`, hitungan `overdueReports` di bms-performance) dan tabel `/dashboard/reports?scope=review_bnm`.

## File Structure

| File | Aksi | Tanggung jawab |
|---|---|---|
| `lib/bnm-review-deadline.ts` | Create | Murni: hitung tenggat, state (`ON_TIME`/`WARNING`/`OVERDUE`), label tenggat, `findOverdueBnmReport`. |
| `lib/bnm-review-deadline.spec.ts` | Create | Spec helper di atas. |
| `lib/bnm-review-entered-at.ts` | Create | Query Prisma: waktu masuk Review BNM per laporan. |
| `lib/bms-active-report-blocker.ts` | Modify | Hapus `APPROVED_BMC` dari daftar blokir; tipe `kind`; judul & pesan baru. |
| `lib/bms-active-report-blocker.spec.ts` | Modify | Perbarui assertion + tambah kasus pesan. |
| `lib/balance.ts` | Modify | `getBmsActiveReportBlocker` mengecek blokir tenggat BNM lebih dulu. |
| `app/reports/_components/bms-create-report-button.tsx` | Modify | Judul toast dinamis. |
| `app/reports/(bms)/create/page.tsx` | Modify | Judul alert + label tombol dinamis. |
| `app/dashboard/settings/_components/settings-workbench.tsx` | Modify | Teks bantuan SLA `APPROVED_BMC`. |
| `lib/app-settings.ts` | Modify | Komentar semantik default. |
| `app/dashboard/queries.ts` | Modify | `ManagerDashboardReport.bnmReview` untuk role BNM. |
| `app/dashboard/_components/bnm-review-badge.tsx` | Create | Client: badge dua tingkat + tooltip info. |
| `app/dashboard/_components/manager-dashboard.tsx` | Modify | Tampilkan badge di kolom Umur. |
| `docs/project/*.md`, `CLAUDE.md`, `docs/agent-notes/...` | Modify/Create | Dokumentasi & catatan tugas. |

---

### Task 1: Helper tenggat BNM (murni, TDD)

**Files:**
- Create: `lib/bnm-review-deadline.ts`
- Test: `lib/bnm-review-deadline.spec.ts`
- Create: `docs/agent-notes/2026-10-15-1000-bnm-review-deadline-and-bms-blocker.md`

**Interfaces:**
- Consumes: `getJakartaDayKey(value: Date | string): string`, `getJakartaDayRange(dateKey: string): { start: Date; endExclusive: Date }` dari `@/lib/time`.
- Produces:
  - `BNM_REVIEW_WARNING_HOURS = 24`, `BNM_REVIEW_DEFAULT_SLA_DAYS = 1`
  - `type BnmReviewState = "ON_TIME" | "WARNING" | "OVERDUE"`
  - `getBnmReviewDeadline(enteredAt: Date, slaDays: number): Date` (eksklusif)
  - `getBnmReviewState(input: { enteredAt: Date; slaDays: number; now?: Date }): BnmReviewState`
  - `formatBnmReviewDeadline(deadlineAt: Date): string` (contoh: `"Kamis, 15 Okt 2026, 23:59 WIB"`)
  - `findOverdueBnmReport<T extends { enteredAt: Date }>(candidates: T[], slaDays: number, now?: Date): (T & { deadlineAt: Date }) | null` (mengembalikan yang tenggatnya paling awal)

- [ ] **Step 1: Tulis spec yang gagal**

Buat `lib/bnm-review-deadline.spec.ts`:

```ts
import assert from "node:assert/strict";
import {
    BNM_REVIEW_DEFAULT_SLA_DAYS,
    findOverdueBnmReport,
    formatBnmReviewDeadline,
    getBnmReviewDeadline,
    getBnmReviewState,
} from "./bnm-review-deadline";

// Rabu 14 Okt 2026 10:00 WIB → batas Kamis 15 Okt 23:59 (deadline eksklusif Jumat 00:00 WIB)
const enteredAt = new Date("2026-10-14T10:00:00+07:00");

assert.equal(BNM_REVIEW_DEFAULT_SLA_DAYS, 1);
assert.equal(
    getBnmReviewDeadline(enteredAt, 1).toISOString(),
    new Date("2026-10-16T00:00:00+07:00").toISOString(),
);
assert.equal(
    getBnmReviewDeadline(enteredAt, 2).toISOString(),
    new Date("2026-10-17T00:00:00+07:00").toISOString(),
);

// Zona waktu: 2026-10-14T20:00Z = Kamis 15 Okt 03:00 WIB → hari WIB = 15, bukan 14
assert.equal(
    getBnmReviewDeadline(new Date("2026-10-14T20:00:00Z"), 1).toISOString(),
    new Date("2026-10-17T00:00:00+07:00").toISOString(),
);

const stateAt = (iso: string) =>
    getBnmReviewState({ enteredAt, slaDays: 1, now: new Date(iso) });

assert.equal(stateAt("2026-10-14T10:00:00+07:00"), "ON_TIME");
assert.equal(stateAt("2026-10-15T09:59:59+07:00"), "ON_TIME");
assert.equal(stateAt("2026-10-15T10:00:01+07:00"), "WARNING");
assert.equal(stateAt("2026-10-15T23:59:59.999+07:00"), "WARNING");
assert.equal(stateAt("2026-10-16T00:00:00+07:00"), "OVERDUE");
assert.equal(stateAt("2026-10-18T12:00:00+07:00"), "OVERDUE");

// Masuk 23:59 WIB: tetap ada >24 jam sebelum overdue (WARNING selalu mendahului OVERDUE)
const lateEntry = new Date("2026-10-14T23:59:00+07:00");
assert.equal(
    getBnmReviewState({
        enteredAt: lateEntry,
        slaDays: 1,
        now: new Date("2026-10-15T23:59:30+07:00"),
    }),
    "WARNING",
);

const label = formatBnmReviewDeadline(getBnmReviewDeadline(enteredAt, 1));
assert.match(label, /Kamis/);
assert.match(label, /15/);
assert.match(label, /2026/);
assert.match(label, /23:59 WIB$/);

const candidates = [
    { reportNumber: "A", enteredAt: new Date("2026-10-14T10:00:00+07:00") },
    { reportNumber: "B", enteredAt: new Date("2026-10-13T09:00:00+07:00") },
    { reportNumber: "C", enteredAt: new Date("2026-10-15T09:00:00+07:00") },
];
const now = new Date("2026-10-16T08:00:00+07:00");
const overdue = findOverdueBnmReport(candidates, 1, now);
assert.equal(overdue?.reportNumber, "B"); // batas B = Rabu 23:59, paling awal
assert.equal(
    overdue?.deadlineAt.toISOString(),
    new Date("2026-10-15T00:00:00+07:00").toISOString(),
);
assert.equal(
    findOverdueBnmReport(candidates, 1, new Date("2026-10-13T12:00:00+07:00")),
    null,
);
assert.equal(findOverdueBnmReport([], 1, now), null);

console.log("bnm-review-deadline.spec OK");
```

- [ ] **Step 2: Jalankan spec, pastikan gagal**

Run: `npx tsx lib/bnm-review-deadline.spec.ts`
Expected: FAIL (`Cannot find module './bnm-review-deadline'`).

- [ ] **Step 3: Implementasi minimal**

Buat `lib/bnm-review-deadline.ts`:

```ts
import {
    JAKARTA_TIME_ZONE,
    getJakartaDayKey,
    getJakartaDayRange,
} from "@/lib/time";

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

export const BNM_REVIEW_WARNING_HOURS = 24;
export const BNM_REVIEW_DEFAULT_SLA_DAYS = 1;

export type BnmReviewState = "ON_TIME" | "WARNING" | "OVERDUE";

const DEADLINE_DAY_FORMATTER = new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
});

/**
 * Batas review BNM (eksklusif): 00:00 WIB di awal hari ke-(slaDays + 1)
 * setelah hari laporan masuk Review BNM. Contoh slaDays=1: masuk Rabu 10:00
 * → batas Kamis 23:59:59 (nilai kembalian = Jumat 00:00 WIB).
 * Asia/Jakarta tidak memakai DST, jadi penambahan 24 jam aman.
 */
export function getBnmReviewDeadline(enteredAt: Date, slaDays: number): Date {
    const dayStart = getJakartaDayRange(getJakartaDayKey(enteredAt)).start;
    return new Date(dayStart.getTime() + (slaDays + 1) * MS_PER_DAY);
}

export function getBnmReviewState({
    enteredAt,
    slaDays,
    now = new Date(),
}: {
    enteredAt: Date;
    slaDays: number;
    now?: Date;
}): BnmReviewState {
    if (now.getTime() >= getBnmReviewDeadline(enteredAt, slaDays).getTime()) {
        return "OVERDUE";
    }
    if (
        now.getTime() - enteredAt.getTime() >
        BNM_REVIEW_WARNING_HOURS * MS_PER_HOUR
    ) {
        return "WARNING";
    }
    return "ON_TIME";
}

/** Label manusiawi untuk batas terakhir, mis. "Kamis, 15 Okt 2026, 23:59 WIB". */
export function formatBnmReviewDeadline(deadlineAt: Date): string {
    const lastMoment = new Date(deadlineAt.getTime() - 60_000);
    return `${DEADLINE_DAY_FORMATTER.format(lastMoment)}, 23:59 WIB`;
}

/** Laporan yang sudah lewat tenggat dengan tenggat paling awal, atau null. */
export function findOverdueBnmReport<T extends { enteredAt: Date }>(
    candidates: T[],
    slaDays: number,
    now: Date = new Date(),
): (T & { deadlineAt: Date }) | null {
    let result: (T & { deadlineAt: Date }) | null = null;

    for (const candidate of candidates) {
        const deadlineAt = getBnmReviewDeadline(candidate.enteredAt, slaDays);
        if (now.getTime() < deadlineAt.getTime()) continue;
        if (!result || deadlineAt.getTime() < result.deadlineAt.getTime()) {
            result = { ...candidate, deadlineAt };
        }
    }

    return result;
}
```

- [ ] **Step 4: Jalankan spec, pastikan lulus**

Run: `npx tsx lib/bnm-review-deadline.spec.ts`
Expected: PASS, mencetak `bnm-review-deadline.spec OK`.

Jika assertion `label` gagal hanya karena format weekday ICU (mis. tanpa koma), sesuaikan regex spec (bukan implementasi) selama masih memuat "Kamis", "15", "2026", dan berakhiran "23:59 WIB".

- [ ] **Step 5: Buat catatan tugas agen**

Salin `docs/agent-notes/TEMPLATE.md` ke `docs/agent-notes/2026-10-15-1000-bnm-review-deadline-and-bms-blocker.md`, isi: Scope (lihat Goal rencana ini), Context and Sources (`docs/superpowers/plans/2026-10-15-bnm-review-deadline-bms-blocker.md`), Changed Files (daftar file Task 1), Decisions (rumus tenggat kalender, ApprovalLog sebagai sumber waktu masuk), Verification (perintah spec Task 1), Remaining Work and Risks: `Indikator SLA admin masih rolling (di luar cakupan)`.

- [ ] **Step 6: Commit**

```bash
git add lib/bnm-review-deadline.ts lib/bnm-review-deadline.spec.ts docs/agent-notes/2026-10-15-1000-bnm-review-deadline-and-bms-blocker.md
git commit -m "feat(bnm-review): add calendar-day deadline helpers

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Pesan & daftar blokir BMS (TDD)

**Files:**
- Modify: `lib/bms-active-report-blocker.ts`
- Modify: `lib/bms-active-report-blocker.spec.ts`

**Interfaces:**
- Consumes: `formatBnmReviewDeadline(deadlineAt: Date): string` (Task 1), `getReportStatusLabel` (sudah ada).
- Produces:
  - `type BmsActiveReportBlockerKind = "ACTIVE_REPORT" | "BNM_REVIEW_OVERDUE"`
  - `BmsActiveReportBlockerSummary` mendapat `kind: BmsActiveReportBlockerKind` dan `bnmDeadlineAt?: Date | null`
  - `formatBmsActiveReportBlockerTitle(blocker: { kind?: BmsActiveReportBlockerKind }): string`
  - `formatBmsActiveReportBlockerMessage(report: Pick<Summary, "reportNumber" | "status"> & Partial<Pick<Summary, "kind" | "bnmDeadlineAt">>): string`

- [ ] **Step 1: Perbarui spec (gagal dulu)**

Edit `lib/bms-active-report-blocker.spec.ts`:

1. Impor tambahan: `formatBmsActiveReportBlockerTitle` dari `./bms-active-report-blocker`.
2. Setelah assertion `ARCHIVED_PREVENTIVE` (baris 18-20), tambahkan:

```ts
assert(!blockingStatuses.includes(ReportStatus.APPROVED_BMC));
assert(blockingStatuses.includes(ReportStatus.REVIEW_REJECTED_REVISION));
assert(blockingStatuses.includes(ReportStatus.PENDING_CHECKLIST_REVIEW));
assert.equal(blockingStatuses.length, 7);
```

3. Ganti blok assertion pesan terakhir (baris 41-47) dengan:

```ts
assert.equal(
    formatBmsActiveReportBlockerMessage({
        reportNumber: "AH01-2609-002",
        status: ReportStatus.PENDING_REVIEW,
    }),
    "Anda bisa membuat laporan baru setelah laporan AH01-2609-002 disetujui BMC. Status saat ini: Review BMC.",
);

assert.equal(
    formatBmsActiveReportBlockerTitle({ kind: "ACTIVE_REPORT" }),
    "Laporan aktif belum selesai",
);
assert.equal(
    formatBmsActiveReportBlockerTitle({ kind: "BNM_REVIEW_OVERDUE" }),
    "Laporan baru diblokir",
);

const overdueMessage = formatBmsActiveReportBlockerMessage({
    reportNumber: "AH01-2609-003",
    status: ReportStatus.APPROVED_BMC,
    kind: "BNM_REVIEW_OVERDUE",
    bnmDeadlineAt: new Date("2026-10-16T00:00:00+07:00"),
});
assert.match(overdueMessage, /AH01-2609-003 belum disetujui BNM/);
assert.match(overdueMessage, /melewati batas waktu review/);
assert.match(overdueMessage, /Kamis/);
assert.match(overdueMessage, /23:59 WIB/);

assert.match(
    formatBmsActiveReportBlockerMessage({
        reportNumber: "AH01-2609-004",
        status: ReportStatus.APPROVED_BMC,
        kind: "BNM_REVIEW_OVERDUE",
    }),
    /^Laporan AH01-2609-004 belum disetujui BNM dan melewati batas waktu review\./,
);

console.log("bms-active-report-blocker.spec OK");
```

- [ ] **Step 2: Jalankan spec, pastikan gagal**

Run: `npx tsx lib/bms-active-report-blocker.spec.ts`
Expected: FAIL (assertion `APPROVED_BMC` masih termasuk / fungsi title belum ada).

- [ ] **Step 3: Implementasi**

Ganti isi `lib/bms-active-report-blocker.ts` (bagian atas sampai tipe) dan fungsi pesan:

```ts
import type { Prisma, ReportStatus } from "@prisma/client";

import { BMS_ACTIVE_REPORT_BLOCKER_CUTOVER } from "@/lib/bms-balance-cutover-policy";
import { formatBnmReviewDeadline } from "@/lib/bnm-review-deadline";
import { getReportStatusLabel } from "@/lib/report-status";

export { BMS_ACTIVE_REPORT_BLOCKER_CUTOVER };

// APPROVED_BMC (Review BNM) sengaja tidak termasuk: BMS boleh membuat laporan
// baru selama BNM belum melewati batas review (lihat lib/bnm-review-deadline.ts).
export const BMS_ACTIVE_REPORT_BLOCKING_STATUSES = [
    "PENDING_ESTIMATION",
    "PENDING_CHECKLIST_REVIEW",
    "ESTIMATION_APPROVED",
    "ESTIMATION_REJECTED_REVISION",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "REVIEW_REJECTED_REVISION",
] as const satisfies readonly ReportStatus[];

export type BmsActiveReportBlockerKind =
    | "ACTIVE_REPORT"
    | "BNM_REVIEW_OVERDUE";

export type BmsActiveReportBlockerSummary = {
    kind: BmsActiveReportBlockerKind;
    reportNumber: string;
    storeName?: string | null;
    storeCode?: string | null;
    status: ReportStatus | string;
    createdAt?: Date;
    updatedAt?: Date;
    bnmDeadlineAt?: Date | null;
};
```

`buildBmsActiveReportBlockerWhere` tidak berubah. Ganti `formatBmsActiveReportBlockerMessage` dan tambahkan fungsi judul:

```ts
export function formatBmsActiveReportBlockerTitle(
    blocker: Partial<Pick<BmsActiveReportBlockerSummary, "kind">>,
) {
    return blocker.kind === "BNM_REVIEW_OVERDUE"
        ? "Laporan baru diblokir"
        : "Laporan aktif belum selesai";
}

export function formatBmsActiveReportBlockerMessage(
    report: Pick<BmsActiveReportBlockerSummary, "reportNumber" | "status"> &
        Partial<Pick<BmsActiveReportBlockerSummary, "kind" | "bnmDeadlineAt">>,
) {
    if (report.kind === "BNM_REVIEW_OVERDUE") {
        const deadline = report.bnmDeadlineAt
            ? ` (${formatBnmReviewDeadline(report.bnmDeadlineAt)})`
            : "";
        return `Laporan ${report.reportNumber} belum disetujui BNM dan melewati batas waktu review${deadline}. Hubungi BNM untuk memprosesnya.`;
    }

    return `Anda bisa membuat laporan baru setelah laporan ${report.reportNumber} disetujui BMC. Status saat ini: ${getReportStatusLabel(report.status)}.`;
}
```

- [ ] **Step 4: Jalankan spec, pastikan lulus**

Run: `npx tsx lib/bms-active-report-blocker.spec.ts && npx tsx lib/bnm-review-deadline.spec.ts`
Expected: keduanya PASS.

- [ ] **Step 5: Type-check (kini `kind` wajib, pemanggil lama akan error)**

Run: `npx tsc --noEmit`
Expected: error hanya di `lib/balance.ts` (nilai kembalian `getBmsActiveReportBlocker` belum punya `kind`). Diselesaikan di Task 3. Jangan commit dulu.

---

### Task 3: Wiring blokir tenggat BNM di `getBmsActiveReportBlocker` + UI BMS

**Files:**
- Create: `lib/bnm-review-entered-at.ts`
- Modify: `lib/balance.ts` (impor di baris 16-27, fungsi di baris 158-181)
- Modify: `app/reports/_components/bms-create-report-button.tsx:53`
- Modify: `app/reports/(bms)/create/page.tsx:11,53,61`

**Interfaces:**
- Consumes: `findOverdueBnmReport`, `BNM_REVIEW_DEFAULT_SLA_DAYS` (Task 1); `BmsActiveReportBlockerSummary.kind`, `formatBmsActiveReportBlockerTitle` (Task 2); `getReportSlaDays()` dari `@/lib/app-settings` (sudah ada, mengembalikan `Partial<Record<ReportStatusKey, number>>`).
- Produces: `getApprovedBmcEnteredAtMap(reports: { reportNumber: string; updatedAt: Date }[]): Promise<Map<string, Date>>` (dipakai juga Task 5); `getBmsActiveReportBlocker` sekarang mengembalikan `kind`.

- [ ] **Step 1: Buat lookup waktu masuk Review BNM**

Buat `lib/bnm-review-entered-at.ts`:

```ts
import prisma from "@/lib/prisma";

/**
 * Waktu laporan (terakhir kali) masuk status APPROVED_BMC = ApprovalLog
 * terbaru berstatus APPROVED_BMC. Fallback ke updatedAt untuk laporan lama
 * yang tidak punya log tersebut.
 */
export async function getApprovedBmcEnteredAtMap(
    reports: { reportNumber: string; updatedAt: Date }[],
): Promise<Map<string, Date>> {
    if (reports.length === 0) return new Map();

    const rows = await prisma.approvalLog.groupBy({
        by: ["reportNumber"],
        where: {
            reportNumber: { in: reports.map((report) => report.reportNumber) },
            status: "APPROVED_BMC",
        },
        _max: { createdAt: true },
    });
    const loggedAt = new Map(
        rows.map((row) => [row.reportNumber, row._max.createdAt] as const),
    );

    return new Map(
        reports.map((report) => [
            report.reportNumber,
            loggedAt.get(report.reportNumber) ?? report.updatedAt,
        ]),
    );
}
```

- [ ] **Step 2: Ubah `lib/balance.ts`**

Impor (ganti blok impor `@/lib/app-settings` dan `@/lib/bms-active-report-blocker` di baris 18 dan 24-27):

```ts
import { getBmsInitialBalance, getReportSlaDays } from "@/lib/app-settings";
import {
    BMS_ACTIVE_REPORT_BLOCKER_CUTOVER,
    buildBmsActiveReportBlockerWhere,
    type BmsActiveReportBlockerSummary,
} from "@/lib/bms-active-report-blocker";
import {
    BNM_REVIEW_DEFAULT_SLA_DAYS,
    findOverdueBnmReport,
} from "@/lib/bnm-review-deadline";
import { getApprovedBmcEnteredAtMap } from "@/lib/bnm-review-entered-at";
```

Ganti `getBmsActiveReportBlocker` (baris 158-181) dengan:

```ts
/**
 * Blokir karena laporan BMS ini menggantung di Review BNM melewati batas
 * waktu. Berlaku apa pun status laporan BMS lainnya; lepas otomatis saat BNM
 * menyetujui atau mengembalikan laporan (status bukan APPROVED_BMC lagi).
 */
async function getBnmReviewOverdueBlocker(
    bmsNIK: string,
    excludeReportNumber?: string,
): Promise<BmsActiveReportBlockerSummary | null> {
    const candidates = await prisma.report.findMany({
        where: {
            createdByNIK: bmsNIK,
            status: "APPROVED_BMC",
            createdAt: { gte: BMS_ACTIVE_REPORT_BLOCKER_CUTOVER },
            ...(excludeReportNumber
                ? { reportNumber: { not: excludeReportNumber } }
                : {}),
        },
        select: {
            reportNumber: true,
            storeName: true,
            storeCode: true,
            status: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (candidates.length === 0) return null;

    const [enteredAtMap, slaDaysByStatus] = await Promise.all([
        getApprovedBmcEnteredAtMap(candidates),
        getReportSlaDays(),
    ]);
    const slaDays =
        slaDaysByStatus.APPROVED_BMC ?? BNM_REVIEW_DEFAULT_SLA_DAYS;
    const overdue = findOverdueBnmReport(
        candidates.map((report) => ({
            ...report,
            enteredAt: enteredAtMap.get(report.reportNumber) ?? report.updatedAt,
        })),
        slaDays,
    );
    if (!overdue) return null;

    return {
        kind: "BNM_REVIEW_OVERDUE",
        reportNumber: overdue.reportNumber,
        storeName: overdue.storeName,
        storeCode: overdue.storeCode,
        status: overdue.status,
        createdAt: overdue.createdAt,
        updatedAt: overdue.updatedAt,
        bnmDeadlineAt: overdue.deadlineAt,
    };
}

export async function getBmsActiveReportBlocker(
    bmsNIK: string,
    options: { excludeReportNumber?: string } = {},
): Promise<BmsActiveReportBlockerSummary | null> {
    const overdueBlocker = await getBnmReviewOverdueBlocker(
        bmsNIK,
        options.excludeReportNumber,
    );
    if (overdueBlocker) return overdueBlocker;

    const period = await getBmsActivePeriod(bmsNIK);
    const report = await prisma.report.findFirst({
        where: buildBmsActiveReportBlockerWhere({
            bmsNIK,
            activePeriodId: period?.id ?? null,
            excludeReportNumber: options.excludeReportNumber,
        }),
        orderBy: [{ updatedAt: "desc" }, { reportNumber: "desc" }],
        select: {
            reportNumber: true,
            storeName: true,
            storeCode: true,
            status: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return report ? { ...report, kind: "ACTIVE_REPORT" } : null;
}
```

- [ ] **Step 3: Judul toast dinamis**

Di `app/reports/_components/bms-create-report-button.tsx`, tambahkan `formatBmsActiveReportBlockerTitle` ke impor (baris 7-10) dan ganti baris 53:

```tsx
                toast.warning(formatBmsActiveReportBlockerTitle(blocker), {
```

Label tombol aksi toast (baris 56) "Lihat" tetap.

- [ ] **Step 4: Judul alert & tombol di halaman create**

Di `app/reports/(bms)/create/page.tsx`: ubah impor baris 11 menjadi

```tsx
import {
  formatBmsActiveReportBlockerMessage,
  formatBmsActiveReportBlockerTitle,
} from "@/lib/bms-active-report-blocker";
```

Ganti baris 53 dan 61:

```tsx
          <AlertTitle>{formatBmsActiveReportBlockerTitle(activeReportBlocker)}</AlertTitle>
```

```tsx
            Lihat laporan terkait
```

- [ ] **Step 5: Type-check, lint, dan jalankan semua spec terkait**

Run:
```bash
npx tsc --noEmit
npx eslint lib/balance.ts lib/bnm-review-entered-at.ts lib/bms-active-report-blocker.ts "app/reports/(bms)/create/page.tsx" app/reports/_components/bms-create-report-button.tsx
npx tsx lib/bms-active-report-blocker.spec.ts
npx tsx lib/bnm-review-deadline.spec.ts
```
Expected: tidak ada error tipe/lint; kedua spec PASS.

- [ ] **Step 6: Uji manual (dev server)**

Run: `npm run dev` (port 3001). Dengan akun BMS uji:
1. Laporan berstatus Review BNM, masuk < tenggat → tombol "Buat Laporan" aktif, `/reports/create` terbuka.
2. Ubah `ApprovalLog.createdAt` laporan itu (Prisma Studio: `npm run db:studio`) ke ≥ 3 hari lalu → tombol berwarna amber, toast berjudul "Laporan baru diblokir" dengan pesan tenggat; `/reports/create` menampilkan alert yang sama; submit langsung via server action ditolak dengan pesan yang sama.
3. Laporan berstatus `IN_PROGRESS` → pesan "…disetujui BMC. Status saat ini: …".
Kembalikan data uji setelah selesai.

- [ ] **Step 7: Perbarui catatan agen lalu commit**

Tambahkan file Task 2-3 ke bagian Changed Files di `docs/agent-notes/2026-10-15-1000-bnm-review-deadline-and-bms-blocker.md` dan hasil verifikasi.

```bash
git add lib/bms-active-report-blocker.ts lib/bms-active-report-blocker.spec.ts lib/balance.ts lib/bnm-review-entered-at.ts app/reports/_components/bms-create-report-button.tsx "app/reports/(bms)/create/page.tsx" docs/agent-notes/2026-10-15-1000-bnm-review-deadline-and-bms-blocker.md
git commit -m "feat(blocker): let BMS create reports during BNM review, block after deadline

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Teks setting SLA & dokumentasi aturan

**Files:**
- Modify: `app/dashboard/settings/_components/settings-workbench.tsx:411-412`
- Modify: `lib/app-settings.ts:33-43`
- Modify: `docs/project/04-workflows.md` (bagian aturan blokir/status; cari dengan `rg -n "selesai|blokir|APPROVED_BMC" docs/project/04-workflows.md`)
- Modify: `CLAUDE.md` (bagian `## Notes`)

**Interfaces:** Tidak ada.

- [ ] **Step 1: Teks bantuan setting**

Ganti kasus `APPROVED_BMC` di `getSlaHelper`:

```tsx
        case "APPROVED_BMC":
            return "Batas waktu BNM melakukan approval final, dihitung hari kalender dengan cut-off 23:59 WIB (1 hari = laporan masuk Rabu, batas Kamis 23:59). Jika terlewat, BMS pemilik laporan tidak bisa membuat laporan baru.";
```

- [ ] **Step 2: Komentar semantik default**

Di `lib/app-settings.ts`, tambahkan komentar tepat di atas `DEFAULT_REPORT_SLA_DAYS`:

```ts
// APPROVED_BMC berbeda dari status lain: dihitung dalam hari kalender Jakarta
// dengan cut-off 23:59 WIB (lihat lib/bnm-review-deadline.ts), dan melewati
// batas ini memblokir BMS membuat laporan baru. Status lain dihitung rolling.
```

- [ ] **Step 3: Dokumentasi**

- `docs/project/04-workflows.md`: tambahkan subbagian "Review BNM dan blokir pembuatan laporan" yang memuat: (a) BMS bebas membuat laporan baru saat laporan berstatus Review BNM; (b) tenggat BNM = 23:59 WIB hari kalender berikutnya (rumus + contoh Rabu→Kamis); (c) lewat tenggat → BMS pemilik laporan diblokir sampai BNM menyetujui/mengembalikan; (d) label dashboard BNM >24 jam dan lewat batas; (e) waktu masuk Review BNM = `ApprovalLog` terakhir `APPROVED_BMC`; (f) saldo operasional tidak berubah.
- `CLAUDE.md` `## Notes`: tambahkan satu butir: `BMS dapat membuat laporan baru saat laporan berstatus APPROVED_BMC (Review BNM); jika BNM melewati batas 23:59 WIB hari kalender berikutnya, BMS diblokir (lib/bnm-review-deadline.ts).`

- [ ] **Step 4: Lint & commit**

Run: `npx eslint app/dashboard/settings/_components/settings-workbench.tsx lib/app-settings.ts`
Expected: tidak ada error.

Tambahkan file ke catatan agen, lalu:

```bash
git add app/dashboard/settings/_components/settings-workbench.tsx lib/app-settings.ts docs/project/04-workflows.md CLAUDE.md docs/agent-notes/2026-10-15-1000-bnm-review-deadline-and-bms-blocker.md
git commit -m "docs(bnm-review): document deadline semantics and setting copy

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Label dua tingkat di kartu "Laporan Menunggu Final BNM"

**Files:**
- Modify: `app/dashboard/queries.ts` (impor baris 10; tipe baris 186-198; `mapManagerReport` baris 240-266; query baris 339-361; mapping baris 404)
- Create: `app/dashboard/_components/bnm-review-badge.tsx`
- Modify: `app/dashboard/_components/manager-dashboard.tsx` (impor; header kolom baris 170; sel Umur baris 219-221)

**Interfaces:**
- Consumes: `getBnmReviewState`, `getBnmReviewDeadline`, `formatBnmReviewDeadline`, `BNM_REVIEW_DEFAULT_SLA_DAYS`, `type BnmReviewState` (Task 1); `getApprovedBmcEnteredAtMap` (Task 3); `getReportSlaDays` (sudah diimpor di `queries.ts`).
- Produces: `ManagerDashboardReport.bnmReview: { state: BnmReviewState; enteredAt: Date; deadlineAt: Date } | null`; komponen `BnmReviewBadge({ state, deadlineAt })`.

- [ ] **Step 1: Tipe & helper di `queries.ts`**

Tambahkan impor setelah baris 10:

```ts
import {
  BNM_REVIEW_DEFAULT_SLA_DAYS,
  getBnmReviewDeadline,
  getBnmReviewState,
  type BnmReviewState,
} from "@/lib/bnm-review-deadline";
import { getApprovedBmcEnteredAtMap } from "@/lib/bnm-review-entered-at";
```

Tambahkan field ke `ManagerDashboardReport` (setelah `ageDays: number;`):

```ts
  bnmReview: {
    state: BnmReviewState;
    enteredAt: Date;
    deadlineAt: Date;
  } | null;
```

Ubah `mapManagerReport` agar menerima argumen kedua dan mengisi field:

```ts
function mapManagerReport(
  report: {
    reportNumber: string;
    storeName: string;
    branchName: string;
    status: string;
    createdAt: Date;
    totalEstimation: unknown;
    totalReal: unknown | null;
    createdBy: { name: string };
    activities: { createdAt: Date }[];
  },
  bnmReview: ManagerDashboardReport["bnmReview"] = null,
): ManagerDashboardReport {
```

dan tambahkan `bnmReview,` di akhir objek kembalian (setelah `ageDays: calculateAgeDays(lastActivityAt),`).

Tambahkan helper tepat di atas `getManagerDashboardData`:

```ts
async function getBnmReviewInfoMap(
  rows: { reportNumber: string; updatedAt: Date }[],
): Promise<Map<string, NonNullable<ManagerDashboardReport["bnmReview"]>>> {
  if (rows.length === 0) return new Map();

  const [enteredAtMap, slaDaysByStatus] = await Promise.all([
    getApprovedBmcEnteredAtMap(rows),
    getReportSlaDays(),
  ]);
  const slaDays = slaDaysByStatus.APPROVED_BMC ?? BNM_REVIEW_DEFAULT_SLA_DAYS;
  const now = new Date();

  return new Map(
    rows.map((row) => {
      const enteredAt = enteredAtMap.get(row.reportNumber) ?? row.updatedAt;
      return [
        row.reportNumber,
        {
          state: getBnmReviewState({ enteredAt, slaDays, now }),
          enteredAt,
          deadlineAt: getBnmReviewDeadline(enteredAt, slaDays),
        },
      ] as const;
    }),
  );
}
```

- [ ] **Step 2: Isi data pada `getManagerDashboardData`**

Pada query `priorityRows` (baris 339-361), tambahkan `updatedAt: true,` ke `select`. Setelah blok `bmsNameMap` (baris 390) tambahkan:

```ts
    const bnmReviewByReport =
      role === "BNM_MANAGER"
        ? await getBnmReviewInfoMap(priorityRows)
        : new Map<string, NonNullable<ManagerDashboardReport["bnmReview"]>>();
```

Ganti baris 404:

```ts
      priorityReports: priorityRows.map((row) =>
        mapManagerReport(row, bnmReviewByReport.get(row.reportNumber) ?? null),
      ),
```

Jika ada literal `ManagerDashboardReport` lain di repo (cek `npx tsc --noEmit`), tambahkan `bnmReview: null`.

- [ ] **Step 3: Komponen badge**

Buat `app/dashboard/_components/bnm-review-badge.tsx`:

```tsx
"use client";

import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    formatBnmReviewDeadline,
    type BnmReviewState,
} from "@/lib/bnm-review-deadline";
import { cn } from "@/lib/utils";

type BnmReviewBadgeProps = {
    state: Exclude<BnmReviewState, "ON_TIME">;
    deadlineAt: Date;
};

export function BnmReviewBadge({ state, deadlineAt }: BnmReviewBadgeProps) {
    const deadline = formatBnmReviewDeadline(deadlineAt);
    const isOverdue = state === "OVERDUE";

    return (
        <TooltipProvider>
            <div className="mt-1 flex items-center gap-1">
                <Badge
                    variant="outline"
                    className={cn(
                        isOverdue
                            ? "border-red-300 bg-red-100 text-red-800"
                            : "border-amber-300 bg-amber-100 text-amber-800",
                    )}
                >
                    {isOverdue ? "Lewat batas" : "Lewat 24 jam"}
                </Badge>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="Info batas waktu review"
                            className="text-muted-foreground"
                        >
                            <Info className="h-3.5 w-3.5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {isOverdue
                            ? `Batas review (${deadline}) sudah terlewat. BMS pemilik laporan tidak bisa membuat laporan baru sampai laporan ini Anda setujui atau kembalikan.`
                            : `Sudah lebih dari 24 jam menunggu approval Anda. Batas review: ${deadline}. Jika terlewat, BMS pemilik laporan tidak bisa membuat laporan baru sampai laporan ini Anda proses.`}
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
```

- [ ] **Step 4: Pasang di kartu**

Di `app/dashboard/_components/manager-dashboard.tsx`, tambahkan impor:

```tsx
import { BnmReviewBadge } from "./bnm-review-badge";
```

Lebarkan kolom Umur (baris 170): ganti `className="w-[110px]"` menjadi `className="min-w-[140px]"`.

Ganti sel Umur (baris 219-221):

```tsx
                                        <TableCell>
                                            <div>{report.ageDays} hari</div>
                                            {report.bnmReview &&
                                            report.bnmReview.state !==
                                                "ON_TIME" ? (
                                                <BnmReviewBadge
                                                    state={
                                                        report.bnmReview.state
                                                    }
                                                    deadlineAt={
                                                        report.bnmReview
                                                            .deadlineAt
                                                    }
                                                />
                                            ) : null}
                                        </TableCell>
```

- [ ] **Step 5: Type-check, lint**

Run:
```bash
npx tsc --noEmit
npx eslint app/dashboard/queries.ts app/dashboard/_components/bnm-review-badge.tsx app/dashboard/_components/manager-dashboard.tsx
```
Expected: tidak ada error.

- [ ] **Step 6: Uji manual**

`npm run dev`, login sebagai BNM_MANAGER. Siapkan 3 laporan `APPROVED_BMC` dengan `ApprovalLog.createdAt` (Prisma Studio): 2 jam lalu (tanpa badge), 30 jam lalu (badge amber "Lewat 24 jam"), 4 hari lalu (badge merah "Lewat batas"). Hover/fokus ikon info: tooltip menyebut batas `…23:59 WIB` dan dampak ke BMS. Cek tampilan lebar mobile (kolom Umur tidak terpotong). Kembalikan data uji.

- [ ] **Step 7: Catatan agen & commit**

```bash
git add app/dashboard/queries.ts app/dashboard/_components/bnm-review-badge.tsx app/dashboard/_components/manager-dashboard.tsx docs/agent-notes/2026-10-15-1000-bnm-review-deadline-and-bms-blocker.md
git commit -m "feat(dashboard): flag BNM reports past 24h and past deadline

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Verifikasi akhir

**Files:** tidak ada perubahan kode (kecuali perbaikan temuan).

- [ ] **Step 1: Jalankan seluruh pemeriksaan**

Run:
```bash
npx tsc --noEmit
npm run lint
npx tsx lib/bnm-review-deadline.spec.ts
npx tsx lib/bms-active-report-blocker.spec.ts
npm run build
```
Expected: semua lulus. Kegagalan lint/tsc yang sudah ada sebelum perubahan ini (cek dengan `git stash` bila ragu) dicatat, bukan diperbaiki di sini.

- [ ] **Step 2: Skenario end-to-end manual (dev)**

1. BMS A: laporan 1 disetujui BMC → Review BNM. A langsung bisa membuat laporan 2 untuk toko lain; laporan 2 masuk alur normal (estimasi tetap dibatasi sisa saldo).
2. BNM melihat laporan 1 di kartu; setelah >24 jam muncul badge amber + tooltip; setelah lewat 23:59 WIB hari berikutnya, badge merah.
3. Setelah lewat tenggat, A tidak bisa membuat laporan baru (UI dan server action); pesan menyebut laporan & batas WIB.
4. BNM menyetujui laporan 1 (→ `COMPLETED`) atau mengembalikan; blokir tenggat hilang tanpa aksi lain. Pada kasus dikembalikan, A tetap terblokir oleh status `REVIEW_REJECTED_REVISION` sampai laporan kembali ke Review BNM (perilaku yang disepakati).
5. Uji dari browser dengan zona waktu non-WIB: tenggat dan teks tetap "23:59 WIB".

- [ ] **Step 3: Finalisasi catatan agen**

Lengkapi bagian Verification dan Remaining Work and Risks di `docs/agent-notes/2026-10-15-1000-bnm-review-deadline-and-bms-blocker.md`:
- Nilai setting `report_sla_approved_bmc_days` yang sudah tersimpan di DB kini bermakna "hari kalender" (bukan rolling); cek nilainya di halaman Settings.
- Indikator SLA admin & tabel `review_bnm` masih rolling / tanpa label (tindak lanjut).
- Notifikasi pengingat berbasis waktu (24 jam / lewat tenggat) ditunda: butuh migrasi enum `NotificationType` dan scheduler cron eksternal.

Commit hanya bila ada perubahan:

```bash
git add docs/agent-notes/2026-10-15-1000-bnm-review-deadline-and-bms-blocker.md
git commit -m "docs(agent-notes): finalize BNM review deadline note

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
