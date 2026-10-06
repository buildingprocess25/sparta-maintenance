# Chunking Query Ekspor XLSX Laporan Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menerapkan strategi Chunking/Batching pada saat query ke database (fetchReportExportRows) untuk menghindari error batas limit parameter pada ekspor data besar (YTD).

**Architecture:** Menggunakan loop `while (true)` dengan `skip` dan `take` pada pemanggilan `prisma.report.findMany()` di layer query (`app/admin/export/queries.ts`). Setiap chunk (misal: 5.000 row) diambil secara bertahap lalu di-push ke satu array memori utama. Relasi `activities` yang menyertakan parameter `IN` hanya akan menerima 5.000 parameter per eksekusi, mencegah PostgreSQL error.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma ORM.

## Global Constraints

- Ukuran chunk didefinisikan secara eksplisit sebagai konstanta `CHUNK_SIZE = 5000`.
- Harus mengumpulkan semua chunk sampai tuntas sebelum melakukan mapping data.
- Tidak boleh mengubah signature / return type dari `fetchReportExportRows`.
- Hindari duplikasi logika filter `where`. Cukup masukkan logika loop di bagian query data.

---

### Task 1: Refaktor `fetchReportExportRows` menjadi Loop Berchunk

**Files:**
- Modify: `app/admin/export/queries.ts`

**Interfaces:**
- Consumes: `filter` yang masuk ke `buildReportWhere(filter)`
- Produces: `Promise<ReportExportRow[]>` dengan field yang sama seperti versi lama.

- [ ] **Step 1: Deklarasikan variabel kontrol untuk Chunking**

  Buka `app/admin/export/queries.ts`, pada fungsi `fetchReportExportRows`.
  Setelah baris `const where = buildReportWhere(filter);`, hapus blok deklarasi statis `const reports = await prisma.report.findMany({ ... })` dan ganti dengan:

  ```typescript
        const where = buildReportWhere(filter);

        const CHUNK_SIZE = 5000;
        let skip = 0;
        const reports: any[] = []; // akan diisi semua data report secara utuh

        while (true) {
            const chunk = await prisma.report.findMany({
                where,
                orderBy: { createdAt: "asc" },
                skip,
                take: CHUNK_SIZE,
                select: {
                    reportNumber: true,
                    createdAt: true,
                    branchName: true,
                    storeCode: true,
                    store: { select: { brand: true } },
                    storeName: true,
                    createdByNIK: true,
                    createdBy: { select: { name: true } },
                    status: true,
                    items: true,
                    totalEstimation: true,
                    totalReal: true,
                    finishedAt: true,
                    pjumExportedAt: true,
                    activities: {
                        orderBy: { createdAt: "asc" },
                        select: {
                            action: true,
                            createdAt: true,
                        },
                    },
                },
            });

            if (chunk.length === 0) {
                break;
            }

            for (const r of chunk) {
                reports.push(r);
            }
            skip += CHUNK_SIZE;
        }
  ```
  *(Catatan untuk engineer: Prisma me-return tipe spesifik dari findMany select. Anda bisa memanfaatkan tipe inferensinya, atau cukup biarkan array kosongan di-*push* di dalam loop, namun lebih disarankan `let reports: Array<Awaited<ReturnType<typeof prisma.report.findMany>>[number]> = []` jika TS strict. Namun karena TS bisa jadi rumit di sini, cara paling aman tanpa mengganggu tiping adalah membuat array dan nge-push)*

  *(Revisi untuk TS yang benar):*
  ```typescript
        const CHUNK_SIZE = 5000;
        let skip = 0;
        
        // Supaya kita tidak kehilangan inferensi tipe Prisma
        type ReportWithRelations = Awaited<ReturnType<typeof prisma.report.findMany>>[number];
        const reports: ReportWithRelations[] = [];

        while (true) {
            const chunk = await prisma.report.findMany({
                where,
                orderBy: { createdAt: "asc" },
                skip,
                take: CHUNK_SIZE,
                select: {
                    reportNumber: true,
                    createdAt: true,
                    branchName: true,
                    storeCode: true,
                    store: { select: { brand: true } },
                    storeName: true,
                    createdByNIK: true,
                    createdBy: { select: { name: true } },
                    status: true,
                    items: true,
                    totalEstimation: true,
                    totalReal: true,
                    finishedAt: true,
                    pjumExportedAt: true,
                    activities: {
                        orderBy: { createdAt: "asc" },
                        select: {
                            action: true,
                            createdAt: true,
                        },
                    },
                },
            });

            if (chunk.length === 0) {
                break;
            }

            for (const r of chunk) {
                reports.push(r as ReportWithRelations);
            }
            skip += CHUNK_SIZE;
        }
  ```

- [ ] **Step 2: Biarkan proses mapping tidak berubah**

  Blok kode `return reports.map((r) => { ... })` yang berada di bawahnya sama sekali tidak perlu diubah karena variabel `reports` sudah menampung array gabungan dari seluruh chunk.

- [ ] **Step 3: Verifikasi TypeScript (`tsc`)**

  Jalankan perintah ini di terminal:
  ```bash
  npx tsc --noEmit
  ```
  Expected: exit 0 (tidak ada error `TS` baru). Abaikan jika ada error di `.next/` dari cache.

- [ ] **Step 4: Commit**

  ```bash
  git add app/admin/export/queries.ts
  git commit -m "perf(export): implement chunking untuk fetchReportExportRows menghindari batas parameter db"
  ```
