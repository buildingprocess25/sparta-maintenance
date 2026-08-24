# AHO Import Performance Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghilangkan Event Loop freeze, banjir notifikasi, dan banjir page refresh yang terjadi saat import XLSX tiket AHO berjalan di background.

**Architecture:** Parser XLSX dipindahkan ke Worker Thread terpisah agar main thread Node.js tidak pernah membeku. Frontend polling diubah dari `setInterval` (fire-and-forget) menjadi `setTimeout` rekursif dengan `isPollingStoppedRef` guard, sehingga tidak ada request yang menumpuk dan toast/refresh hanya dipanggil tepat satu kali.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Node.js `worker_threads` (built-in), `xlsx` library, Prisma + PostgreSQL, React 19, Sonner (toast), next/navigation router.

## Global Constraints

- Runtime target: Node.js >= 18 (`worker_threads` built-in, tanpa instalasi dependency baru)
- Tidak ada dependency npm baru — gunakan semua yang sudah ada di `package.json`
- Tidak mengubah Prisma schema — tidak perlu migrasi DB
- Tidak mengubah antarmuka publik fungsi di `actions.ts` yang dikonsumsi page lain
- Semua teks UI tetap dalam Bahasa Indonesia (sesuai konvensi kodebase)
- TypeScript strict mode — tidak boleh ada `any` baru
- Commit per task — setiap task berakhir dengan `git commit`

---

## Peta File yang Diubah

| File | Aksi | Tujuan |
|------|------|--------|
| `lib/jobs/aho-import-worker.ts` | **Buat baru** | Worker Thread script — berjalan di thread terpisah, melakukan XLSX parse + DB sync |
| `lib/jobs/aho-import.ts` | **Tulis ulang** | Hanya spawn worker thread; hapus `parseFormatBXlsx` dan logika sync dari main thread |
| `app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx` | **Modifikasi** | Ganti `setInterval` dengan `setTimeout` rekursif + `isPollingStoppedRef` guard |
| `docs/agent-notes/2026-08-22-HHMM-aho-import-perf-fix.md` | **Buat baru** | Task note wajib per AGENTS.md |

---

## Task 1: Buat Worker Thread Script (`aho-import-worker.ts`)

Ini adalah inti dari perbaikan. Seluruh CPU-intensive work (baca XLSX + sync DB) dipindahkan ke file ini yang berjalan di thread terpisah, sehingga main thread Node.js bebas melayani request lain.

**Files:**
- Create: `lib/jobs/aho-import-worker.ts`

**Interfaces:**
- Consumes: `workerData.jobId: string`, `workerData.bufferBase64: string`, `workerData.requestedByNIK: string` dari parent thread
- Produces: `parentPort.postMessage({ type: 'done' })` atau `parentPort.postMessage({ type: 'error', message: string })`

- [ ] **Step 1: Buat file `lib/jobs/aho-import-worker.ts`**

Buat file baru dengan konten berikut (file ini adalah port dari seluruh logika `_runImportJob` yang lama):

```typescript
// lib/jobs/aho-import-worker.ts
// Script ini dijalankan oleh Node.js Worker Thread.
// JANGAN import modul Next.js atau React di sini.

import { workerData, parentPort } from "worker_threads";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { SETTING_KEYS, updateAppSetting } from "@/lib/app-settings";
import * as XLSX from "xlsx";

if (!parentPort) {
    throw new Error("This file must be run as a Worker Thread");
}

// --- Types ---

type ParsedRow = {
    storeCode: string;
    problemNo: string;
    status: string;
    branchCode: string;
    branchName: string;
};

type ParseFormatBResult = {
    rows: ParsedRow[];
    printDate: Date | null;
    error?: string;
};

type AhoImportResult = {
    success: boolean;
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    total: number;
    printDate: string | null;
    errors: string[];
    duplicates: string[];
};

const MAX_IMPORT_ERRORS = 50;

// --- XLSX Parser ---

function parseFormatBXlsx(buffer: Buffer): ParseFormatBResult {
    const wb = XLSX.read(buffer, { type: "buffer", raw: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { rows: [], printDate: null, error: "File XLSX kosong (tidak ada sheet)" };

    const ws = wb.Sheets[sheetName];
    const ref = ws["!ref"];
    if (!ref) return { rows: [], printDate: null, error: "File XLSX tidak memiliki data" };

    const range = XLSX.utils.decode_range(ref);
    const R_MIN = range.s.r;
    const R_MAX = range.e.r;
    const C_MAX = range.e.c;

    const cellStr = (r: number, c: number): string => {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (!cell) return "";
        return String(cell.v ?? "").trim();
    };

    let printDate: Date | null = null;
    for (let r = R_MIN; r <= Math.min(R_MIN + 20, R_MAX); r++) {
        const firstCell = cellStr(r, 0).toLowerCase();
        if (firstCell === "tanggal cetak") {
            const rawVal = cellStr(r, 1).replace(/^:\s*/, "");
            const normalized = rawVal.replace(" - ", " ");
            const parsed = new Date(normalized + " +07:00");
            if (!isNaN(parsed.getTime())) printDate = parsed;
            break;
        }
    }

    const TARGET_COLS: Record<string, string[]> = {
        storeCode:  ["kode toko"],
        problemNo:  ["no. problem", "no problem"],
        status:     ["status"],
        branchCode: ["kode cabang existing"],
        branchName: ["cabang existing", "nama cabang existing"],
    };

    let headerRowIndex = -1;
    const colIndexMap: Record<string, number> = {};

    for (let r = R_MIN; r <= Math.min(R_MIN + 50, R_MAX); r++) {
        let foundProblemNo = false;
        let foundStoreCode = false;
        const cellsInRow: string[] = [];
        for (let c = 0; c <= C_MAX; c++) {
            cellsInRow.push(cellStr(r, c).toLowerCase());
        }
        for (let c = 0; c <= C_MAX; c++) {
            const txt = cellsInRow[c];
            if (TARGET_COLS.problemNo.includes(txt)) foundProblemNo = true;
            if (TARGET_COLS.storeCode.includes(txt)) foundStoreCode = true;
        }
        if (foundProblemNo && foundStoreCode) {
            headerRowIndex = r;
            for (const [field, aliases] of Object.entries(TARGET_COLS)) {
                for (let c = 0; c <= C_MAX; c++) {
                    if (aliases.includes(cellsInRow[c])) {
                        colIndexMap[field] = c;
                        break;
                    }
                }
            }
            break;
        }
    }

    if (headerRowIndex === -1) {
        return {
            rows: [],
            printDate,
            error: "Format file tidak dikenali. Pastikan file adalah laporan AHO dari sistem IRIS Alfamart.",
        };
    }

    const requiredFields = ["storeCode", "problemNo", "status"] as const;
    const missingFields = requiredFields.filter((f) => colIndexMap[f] === undefined);
    if (missingFields.length > 0) {
        return {
            rows: [],
            printDate,
            error: `Kolom wajib tidak ditemukan: ${missingFields.join(", ")}. Pastikan menggunakan file AHO dari IRIS.`,
        };
    }

    const rows: ParsedRow[] = [];
    const cStoreCode  = colIndexMap.storeCode;
    const cProblemNo  = colIndexMap.problemNo;
    const cStatus     = colIndexMap.status;
    const cBranchCode = colIndexMap.branchCode;
    const cBranchName = colIndexMap.branchName;

    for (let r = headerRowIndex + 1; r <= R_MAX; r++) {
        const storeCode = cellStr(r, cStoreCode).toUpperCase();
        const problemNo = cellStr(r, cProblemNo);
        const statusRaw = cellStr(r, cStatus);

        if (!storeCode || !problemNo || !statusRaw) continue;

        const branchCode = cBranchCode !== undefined ? cellStr(r, cBranchCode) : "";
        let branchName   = cBranchName !== undefined ? cellStr(r, cBranchName) : "";

        if (branchName.toUpperCase().startsWith("DC ")) {
            branchName = branchName.substring(3).trim();
        }

        rows.push({ storeCode, problemNo, status: statusRaw, branchCode, branchName });
    }

    return { rows, printDate };
}

// --- Bulk Upsert ---

async function upsertAhoTickets(
    rows: {
        storeCode: string;
        problemNo: string;
        status: string;
        branchCode: string | null;
        branchName: string | null;
    }[],
): Promise<{ created: number; updated: number }> {
    if (rows.length === 0) return { created: 0, updated: 0 };

    const CHUNK_SIZE = 1_000;
    let totalCreated = 0;
    let totalUpdated = 0;

    for (let offset = 0; offset < rows.length; offset += CHUNK_SIZE) {
        const chunk = rows.slice(offset, offset + CHUNK_SIZE);
        const placeholders: string[] = [];
        const values: (string | null)[] = [];

        chunk.forEach((row, i) => {
            const base = i * 5;
            placeholders.push(
                `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`,
            );
            values.push(row.storeCode, row.problemNo, row.status, row.branchCode, row.branchName);
        });

        const sql = `
            INSERT INTO "MasterAhoTicket" ("id", "storeCode", "problemNo", "status", "branchCode", "branchName", "updatedAt")
            SELECT
                gen_random_uuid(),
                v."storeCode",
                v."problemNo",
                v."status",
                v."branchCode",
                v."branchName",
                NOW()
            FROM (VALUES ${placeholders.join(", ")}) AS v("storeCode", "problemNo", "status", "branchCode", "branchName")
            ON CONFLICT ("storeCode", "problemNo") DO UPDATE SET
                "status"     = EXCLUDED."status",
                "branchCode" = EXCLUDED."branchCode",
                "branchName" = EXCLUDED."branchName",
                "updatedAt"  = NOW()
            RETURNING (xmax = 0) AS is_insert
        `;

        const result = await prisma.$queryRawUnsafe<{ is_insert: boolean }[]>(sql, ...values);
        totalCreated += result.filter((r) => r.is_insert).length;
        totalUpdated += result.filter((r) => !r.is_insert).length;
    }

    return { created: totalCreated, updated: totalUpdated };
}

// --- Main Worker Execution ---

async function runWorker() {
    const { jobId, bufferBase64, requestedByNIK } = workerData as {
        jobId: string;
        bufferBase64: string;
        requestedByNIK: string;
    };

    const buffer = Buffer.from(bufferBase64, "base64");
    const startTime = Date.now();

    const result: AhoImportResult = {
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        total: 0,
        printDate: null,
        errors: [],
        duplicates: [],
    };

    try {
        await prisma.ahoImportJob.update({
            where: { id: jobId },
            data: { status: "processing", startedAt: new Date() },
        });

        const { rows: allRows, printDate, error } = parseFormatBXlsx(buffer);
        if (error) {
            result.errors.push(error);
            await prisma.ahoImportJob.update({
                where: { id: jobId },
                data: {
                    status: "failed",
                    errorMessage: error,
                    result: result as object,
                    completedAt: new Date(),
                    fileBuffer: Buffer.alloc(0),
                },
            });
            parentPort!.postMessage({ type: "done" });
            return;
        }

        result.printDate = printDate ? printDate.toISOString() : null;
        result.total = allRows.length;

        const VALID_STATUSES = ["New", "Progress"];
        const activeRows: ParsedRow[] = [];
        for (const row of allRows) {
            const status = row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase();
            if (VALID_STATUSES.includes(status)) {
                activeRows.push({ ...row, status });
            } else {
                result.skipped++;
            }
        }

        const codesInFile = new Set(activeRows.map((r) => r.storeCode));
        const validStoreCodes = new Set(
            (
                await prisma.store.findMany({
                    where: { code: { in: Array.from(codesInFile) } },
                    select: { code: true },
                })
            ).map((s) => s.code),
        );

        const incomingMap = new Map<
            string,
            { storeCode: string; problemNo: string; status: string; branchCode: string; branchName: string }
        >();
        for (const row of activeRows) {
            if (!validStoreCodes.has(row.storeCode)) {
                result.skipped++;
                if (result.errors.length < MAX_IMPORT_ERRORS) {
                    result.errors.push(`(${row.storeCode}): Kode Toko tidak ditemukan di sistem`);
                }
                continue;
            }
            const key = `${row.storeCode}_${row.problemNo}`;
            if (incomingMap.has(key)) {
                if (result.duplicates.length < MAX_IMPORT_ERRORS) {
                    result.duplicates.push(`Duplikat dalam file: ${row.storeCode} - ${row.problemNo}. Menggunakan data terakhir.`);
                }
            }
            incomingMap.set(key, row);
        }

        const existingTickets = await prisma.masterAhoTicket.findMany({
            select: { id: true, storeCode: true, problemNo: true, status: true, branchCode: true, branchName: true },
        });
        const existingMap = new Map(existingTickets.map((t) => [`${t.storeCode}_${t.problemNo}`, t]));
        const existingById = new Map(existingTickets.map((t) => [t.id, t]));

        const toCreate: { storeCode: string; problemNo: string; status: string; branchCode: string | null; branchName: string | null }[] = [];
        const toUpdate: { id: string; status: string; branchCode: string | null; branchName: string | null }[] = [];
        const toDeleteIds: string[] = [];

        for (const [key, incoming] of incomingMap.entries()) {
            const existing = existingMap.get(key);
            if (!existing) {
                toCreate.push({
                    storeCode: incoming.storeCode,
                    problemNo: incoming.problemNo,
                    status: incoming.status,
                    branchCode: incoming.branchCode || null,
                    branchName: incoming.branchName || null,
                });
            } else {
                const statusChanged = existing.status !== incoming.status;
                const branchCodeChanged = (existing.branchCode ?? "") !== (incoming.branchCode ?? "");
                const branchNameChanged = (existing.branchName ?? "") !== (incoming.branchName ?? "");
                if (statusChanged || branchCodeChanged || branchNameChanged) {
                    toUpdate.push({
                        id: existing.id,
                        status: incoming.status,
                        branchCode: incoming.branchCode || null,
                        branchName: incoming.branchName || null,
                    });
                }
            }
        }

        for (const [key, existing] of existingMap.entries()) {
            if (!incomingMap.has(key)) {
                toDeleteIds.push(existing.id);
            }
        }

        const allIncoming = [
            ...toCreate,
            ...toUpdate.map(({ id: _id, ...data }) => {
                const existing = existingById.get(_id)!;
                return {
                    storeCode: existing.storeCode,
                    problemNo: existing.problemNo,
                    status: data.status,
                    branchCode: data.branchCode ?? null,
                    branchName: data.branchName ?? null,
                };
            }),
        ];

        const { created, updated } = await upsertAhoTickets(allIncoming);

        let deleted = 0;
        if (toDeleteIds.length > 0) {
            const deleteResult = await prisma.masterAhoTicket.deleteMany({
                where: { id: { in: toDeleteIds } },
            });
            deleted = deleteResult.count;
        }

        result.created = created;
        result.updated = updated;
        result.deleted = deleted;
        result.success = true;

        if (printDate) {
            await updateAppSetting(
                SETTING_KEYS.AHO_LAST_PRINT_DATE,
                printDate.toISOString(),
                requestedByNIK,
            );
        }

        const duration = Date.now() - startTime;
        logger.info(
            {
                operation: "processAhoImportJob",
                jobId,
                userId: requestedByNIK,
                total: result.total,
                created: result.created,
                updated: result.updated,
                deleted: result.deleted,
                duration,
            },
            "Admin bulk AHO ticket sync completed",
        );

        await prisma.ahoImportJob.update({
            where: { id: jobId },
            data: {
                status: "done",
                result: result as object,
                completedAt: new Date(),
                fileBuffer: Buffer.alloc(0),
            },
        });

        parentPort!.postMessage({ type: "done" });
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        logger.error(
            { operation: "processAhoImportJob", jobId },
            "Failed to process AHO import job",
            error,
        );
        await prisma.ahoImportJob.update({
            where: { id: jobId },
            data: {
                status: "failed",
                errorMessage: errMsg,
                result: result as object,
                completedAt: new Date(),
                fileBuffer: Buffer.alloc(0),
            },
        });
        parentPort!.postMessage({ type: "error", message: errMsg });
    } finally {
        await prisma.$disconnect();
    }
}

runWorker();
```

- [ ] **Step 2: Verifikasi file terbuat**

```powershell
Get-Item lib/jobs/aho-import-worker.ts
```

Expected: File ada, ukuran > 5KB.

- [ ] **Step 3: Commit**

```bash
git add lib/jobs/aho-import-worker.ts
git commit -m "feat(aho-import): add worker thread script for xlsx parsing and db sync"
```

---

## Task 2: Ubah `aho-import.ts` — Spawn Worker, Hapus Logika Lama

Hapus semua CPU-intensive code dari main thread. `processAhoImportJobWithBuffer` sekarang hanya bertugas spawn worker dan mengembalikan kontrol segera ke caller.

**Files:**
- Modify: `lib/jobs/aho-import.ts` (tulis ulang seluruh file)

**Interfaces:**
- Consumes: `lib/jobs/aho-import-worker.ts` (via `new Worker(workerPath, { workerData })`)
- Produces:
  - `processAhoImportJobWithBuffer(jobId: string, buffer: Buffer, requestedByNIK: string): Promise<void>`
  - `processAhoImportJob(jobId: string): Promise<void>`
  - `export type AhoImportResult` — re-export agar import di komponen lain tidak perlu diubah

- [ ] **Step 1: Tulis ulang `lib/jobs/aho-import.ts` seluruhnya**

Ganti seluruh isi file dengan kode berikut:

```typescript
// lib/jobs/aho-import.ts
// Entry point untuk proses import AHO.
// Semua logika berat (parse XLSX, sync DB) dijalankan di Worker Thread terpisah
// agar main thread Node.js tidak pernah membeku.

import path from "path";
import { Worker } from "worker_threads";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Re-export type agar komponen lain tidak perlu mengubah import mereka
export type AhoImportResult = {
    success: boolean;
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    total: number;
    printDate: string | null;
    errors: string[];
    duplicates: string[];
};

/**
 * Spawn Worker Thread untuk memproses import AHO.
 * Fungsi ini TIDAK MEMBLOKIR main thread — mengembalikan kontrol segera ke caller.
 * Status job diupdate langsung oleh worker ke DB.
 */
export async function processAhoImportJobWithBuffer(
    jobId: string,
    buffer: Buffer,
    requestedByNIK: string,
): Promise<void> {
    const workerPath = path.resolve(
        process.cwd(),
        "lib/jobs/aho-import-worker.ts",
    );

    // Encode buffer ke base64 untuk transfer ke worker.
    // workerData menggunakan structured clone; Buffer tidak selalu ter-clone dengan benar
    // di semua environment, sehingga base64 string lebih aman.
    const bufferBase64 = buffer.toString("base64");

    const worker = new Worker(workerPath, {
        workerData: { jobId, bufferBase64, requestedByNIK },
        // tsx/esm loader diperlukan agar worker bisa menjalankan file TypeScript langsung
        execArgv: ["--import", "tsx/esm"],
    });

    worker.on("message", (msg: { type: string; message?: string }) => {
        if (msg.type === "error") {
            logger.error(
                { operation: "processAhoImportJobWithBuffer", jobId },
                `Worker reported error: ${msg.message}`,
            );
        }
    });

    worker.on("error", (err) => {
        logger.error(
            { operation: "processAhoImportJobWithBuffer", jobId },
            "Worker thread crashed unexpectedly",
            err,
        );
        // Best-effort: tandai job sebagai failed jika worker crash sebelum sempat update sendiri
        prisma.ahoImportJob
            .update({
                where: { id: jobId },
                data: {
                    status: "failed",
                    errorMessage: err.message,
                    completedAt: new Date(),
                    fileBuffer: Buffer.alloc(0),
                },
            })
            .catch(() => {
                // Abaikan DB error pada crash handler
            });
    });

    worker.on("exit", (code) => {
        if (code !== 0) {
            logger.warn(
                { operation: "processAhoImportJobWithBuffer", jobId, exitCode: code },
                "Worker thread exited with non-zero code",
            );
        }
    });
}

/**
 * Alternatif: proses job berdasarkan jobId saja, membaca buffer dari DB.
 * Bisa digunakan oleh route handler /api/cron jika diperlukan.
 */
export async function processAhoImportJob(jobId: string): Promise<void> {
    const job = await prisma.ahoImportJob.findUnique({ where: { id: jobId } });
    if (!job) {
        logger.error({ operation: "processAhoImportJob", jobId }, "Job not found");
        return;
    }
    return processAhoImportJobWithBuffer(jobId, Buffer.from(job.fileBuffer), job.requestedByNIK);
}
```

- [ ] **Step 2: Verifikasi TypeScript tidak ada error baru**

```powershell
npx tsc --noEmit --project tsconfig.json 2>&1 | Select-String "aho-import"
```

Expected: Tidak ada baris output (tidak ada error di file aho-import).

- [ ] **Step 3: Commit**

```bash
git add lib/jobs/aho-import.ts
git commit -m "refactor(aho-import): spawn worker thread, remove blocking logic from main thread"
```

---

## Task 3: Perbaiki Polling Frontend — `setInterval` ke `setTimeout` Rekursif

Memperbaiki "Infinity Notif" dan banjir `router.refresh()`. Perubahan kunci:
1. `setInterval` => recursive `setTimeout` => tidak ada request overlap
2. `isPollingStoppedRef` guard => respons in-flight setelah stop diabaikan
3. `router.refresh()` + toast hanya dipanggil sekali

**Files:**
- Modify: `app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx`

**Interfaces:**
- Consumes: `/api/admin/import-aho/[jobId]` GET — response shape tidak berubah
- Produces: UI identik, hanya logika internal polling yang berubah

- [ ] **Step 1: Ganti deklarasi refs dan `stopPolling` (baris 42-50)**

Temukan blok berikut di file:
```typescript
const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
const pollStartRef = useRef<number>(0);

const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
    }
}, []);
```

Ganti seluruh blok di atas dengan:
```typescript
const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const pollStartRef = useRef<number>(0);
const isPollingStoppedRef = useRef<boolean>(false);

const stopPolling = useCallback(() => {
    isPollingStoppedRef.current = true;
    if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
    }
}, []);
```

- [ ] **Step 2: Ganti implementasi `startPolling` seluruhnya (baris 92-159)**

Temukan dan ganti seluruh blok `const startPolling = useCallback(` hingga penutupnya:

```typescript
const startPolling = useCallback(
    (jobId: string) => {
        isPollingStoppedRef.current = false;
        pollStartRef.current = Date.now();
        setProgress(10);

        const poll = async () => {
            // Guard: jika polling sudah dihentikan, abaikan eksekusi ini
            if (isPollingStoppedRef.current) return;

            // Safety timeout: hentikan setelah 10 menit
            if (Date.now() - pollStartRef.current > MAX_POLL_DURATION_MS) {
                stopPolling();
                setJobStatus("failed");
                setProgress(100);
                toast.error("Proses import timeout", {
                    description:
                        "Proses memakan waktu terlalu lama. Silakan refresh halaman untuk memeriksa apakah data sudah tersimpan.",
                });
                return;
            }

            try {
                const res = await fetch(`/api/admin/import-aho/${jobId}`);

                // Guard setelah await fetch — modal mungkin ditutup saat fetch berjalan
                if (isPollingStoppedRef.current) return;

                if (!res.ok) {
                    // Network hiccup — jadwalkan poll berikutnya
                    pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
                    return;
                }

                const data = await res.json();

                // Guard setelah json parse
                if (isPollingStoppedRef.current) return;

                if (data.status === "processing") {
                    setJobStatus("processing");
                    setProgress((prev) => Math.min(90, prev + 5));
                    // Poll berikutnya dijadwalkan HANYA setelah yang ini selesai (non-overlapping)
                    pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
                } else if (data.status === "done") {
                    stopPolling();
                    setJobStatus("done");
                    setProgress(100);
                    setResult(data.result as AhoImportResult);
                    router.refresh();

                    const r = data.result as AhoImportResult;
                    if (r.errors.length === 0) {
                        toast.success("Import tiket AHO berhasil", {
                            description: `${r.created} tiket tersimpan dari ${r.total} baris.`,
                        });
                    } else {
                        toast.warning("Import selesai dengan catatan", {
                            description: `${r.skipped} baris dilewati. Lihat detail di panel hasil.`,
                        });
                    }
                } else if (data.status === "failed") {
                    stopPolling();
                    setJobStatus("failed");
                    setProgress(100);
                    setResult(data.result as AhoImportResult | null);
                    toast.error("Import tiket AHO gagal", {
                        description:
                            data.errorMessage ??
                            data.result?.errors?.[0] ??
                            "Terjadi kendala saat import.",
                    });
                } else {
                    // status "pending" — lanjut poll
                    pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
                }
            } catch {
                // Network error sementara — coba lagi jika belum dihentikan
                if (!isPollingStoppedRef.current) {
                    pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
                }
            }
        };

        // Mulai poll pertama setelah interval pertama
        pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    },
    [stopPolling, router],
);
```

- [ ] **Step 3: Verifikasi TypeScript tidak ada error**

```powershell
npx tsc --noEmit --project tsconfig.json 2>&1 | Select-String "import-aho-tickets"
```

Expected: Tidak ada output error.

- [ ] **Step 4: Test manual di dev server**

1. Jalankan `npm run dev`
2. Login sebagai ADMIN, buka `http://localhost:3000/dashboard/aho-tickets`
3. Klik "Import XLSX", upload file AHO
4. Amati log server: request ke `/api/admin/import-aho/[id]` harus muncul satu per satu dengan jeda ~3 detik, TIDAK bersamaan
5. Amati UI: toast harus muncul tepat 1 kali setelah proses selesai
6. Akses `http://localhost:3000/api/health` di tab baru saat import berlangsung: harus merespons < 500ms

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx
git commit -m "fix(aho-import): replace setInterval with recursive setTimeout to prevent notification stampede"
```

---

## Task 4: Verifikasi Build & Task Note

**Files:**
- Create: `docs/agent-notes/2026-08-22-HHMM-aho-import-perf-fix.md`

- [ ] **Step 1: Build production untuk verifikasi TypeScript bersih**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS"
```

Expected: Tidak ada baris output (tidak ada TypeScript error).

- [ ] **Step 2: Buat task note wajib**

Buat file `docs/agent-notes/2026-08-22-HHMM-aho-import-perf-fix.md` (ganti HHMM dengan waktu Asia/Jakarta saat ini):

```markdown
# AHO Import Performance Fix

## Scope

Memperbaiki dua bug terpisah: (1) Event Loop Node.js membeku selama 7+ menit
karena XLSX.read berjalan synchronous di main thread, dan (2) banjir notifikasi
(infinity notif) karena setInterval menumpuk request polling yang kemudian
direspons serentak saat freeze selesai.

## Context and Sources

- Analisis log server 2026-08-21, sesi brainstorming 2026-08-22
- lib/jobs/aho-import.ts (kode lama)
- app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx

## Changed Files

- lib/jobs/aho-import-worker.ts: [NEW] Worker Thread script - semua CPU-intensive work berjalan di sini.
- lib/jobs/aho-import.ts: Ditulis ulang; hanya spawn Worker Thread, tidak ada blocking logic.
- app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx: Ganti setInterval dengan setTimeout rekursif + isPollingStoppedRef guard.

## Decisions

- Worker Thread dipilih karena built-in Node.js >= 18, tidak perlu dependency baru.
- Buffer dikirim ke worker via base64 encoding untuk keamanan serialisasi structured clone.
- isPollingStoppedRef.current diset true sebelum clearTimeout agar fetch yang sedang in-flight tidak memproses hasilnya setelah worker dihentikan.

## Verification

- npx tsc --noEmit: tidak ada error TypeScript
- npm run build: build sukses
- Manual test: upload file AHO, verifikasi toast muncul tepat 1x dan request polling berurutan

## Remaining Work and Risks

- Worker Thread menggunakan tsx/esm loader. Perlu verifikasi di production standalone build.
  Jika gagal, fallback: compile worker ke JS via tsc, atau ganti execArgv yang sesuai environment.
```

- [ ] **Step 3: Commit task note**

```bash
git add docs/agent-notes/
git commit -m "docs: add task note for aho import performance fix"
```

---

## Catatan Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Worker Thread gagal di production standalone (tsx/esm tidak tersedia) | Worker tidak bisa spawn, import gagal | Jika terjadi, ganti `execArgv` dengan loader yang sesuai environment, atau pre-compile worker ke JS |
| Base64 encoding menambah ~33% overhead memory (70MB => ~93MB) | Memory usage sedikit naik | Dapat diganti dengan `SharedArrayBuffer` atau tulis buffer ke file temp jika menjadi masalah |
| Prisma Client membuat koneksi DB baru di setiap Worker | Pool connection bisa penuh jika banyak import bersamaan | `prisma.$disconnect()` dipanggil di `finally` block; import AHO didesain one-at-a-time |
| Next.js `after()` tidak menjamin worker thread tetap hidup | Worker bisa terputus di production | Pindahkan spawn ke luar `after()` jika diperlukan; worker sudah self-contained |
