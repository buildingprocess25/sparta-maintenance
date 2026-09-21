# Filter Laporan Gantung Berdasarkan Kebutuhan PJUM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki deteksi "Laporan Gantung" di UI agar hanya menampilkan laporan yang benar-benar membutuhkan PJUM, sehingga mencegah false alarm pada laporan vendor atau laporan dengan biaya Rp 0.

**Architecture:** Memodifikasi `getOmittedHangingReportsForPjum` di `lib/balance.ts` untuk mengambil data JSON `items` dari database dan memfilter hasil query menggunakan `requiresPjum` sebelum dikembalikan ke UI.

**Tech Stack:** Next.js, Prisma, TypeScript.

## Global Constraints

- Kode harus menggunakan TypeScript strict type.
- Laporan gantung historis (yang memiliki `pjumHangingAt`) harus tetap ditampilkan meskipun logic `requiresPjum` ke depannya berubah.

---

### Task 1: Update Filter getOmittedHangingReportsForPjum

**Files:**
- Modify: `lib/balance.ts:50-70`

**Interfaces:**
- Consumes: `requiresPjum` dari `lib/realisasi.ts`
- Produces: Memperbarui return dari `getOmittedHangingReportsForPjum` agar tidak merusak UI `app/dashboard/pjum/[id]/page.tsx` (signature tetap sama, jumlah data saja yang berkurang).

- [ ] **Step 1: Modifikasi Query Prisma**

Ubah bagian `select` pada `prisma.report.findMany` di dalam fungsi `getOmittedHangingReportsForPjum` (`lib/balance.ts`) untuk mengambil `items` dan `pjumHangingAt`:

```typescript
        select: {
            reportNumber: true,
            storeName: true,
            storeCode: true,
            finishedAt: true,
            totalReal: true,
            items: true,
            pjumHangingAt: true,
        },
```

- [ ] **Step 2: Filter Data yang Dikembalikan**

Saring (filter) laporan-laporan tersebut dengan `requiresPjum` sebelum diproses ke bentuk return awal:

```typescript
    return reports
        .filter((report) => report.pjumHangingAt !== null || requiresPjum(report.totalReal, report.items))
        .map((report) => ({
            reportNumber: report.reportNumber,
            storeName: report.storeName,
            storeCode: report.storeCode,
            finishedAt: report.finishedAt,
            realizedAmount: report.totalReal
                ? new Prisma.Decimal(report.totalReal.toString()).toNumber()
                : 0,
        }));
```

- [ ] **Step 3: Pastikan tidak ada Error Typescript**

Run: `npx tsc --noEmit`
Expected: PASS tanpa error yang bersumber dari `lib/balance.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/balance.ts
git commit -m "fix(pjum): filter omitted hanging reports by requiresPjum

Mencegah laporan yang tidak membutuhkan PJUM terdeteksi sebagai laporan gantung pada UI detail PJUM."
```
