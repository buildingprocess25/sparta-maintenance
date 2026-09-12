# Perbaikan Filter & Kolom Status PJUM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki filter Status PJUM agar berjalan dengan baik saat mengekspor laporan, serta menambahkan kolom baru "Status PJUM" pada hasil file Excel (XLSX).

**Architecture:** Modifikasi akan dilakukan pada file *API route* ekspor untuk menyisipkan kolom baru pada array baris Excel. Pada file `queries.ts`, kita akan memastikan *Prisma where clause* untuk *null checking* menggunakan format objek yang paling aman (strict) agar tidak terjadi kegagalan (error) saat di-run.

**Tech Stack:** Next.js, Prisma, xlsx

## Global Constraints

Tidak ada library tambahan, ikuti konvensi *export reports* yang sudah ada.

---

### Task 1: Update API Export (Menambah Kolom & Memperbaiki Query)

**Files:**
- Modify: `app/api/admin/export/route.ts`
- Modify: `app/admin/export/queries.ts`

**Interfaces:**
- Menghasilkan file Excel dengan tambahan satu kolom yaitu "Status PJUM" sebelum atau sesudah kolom "Tanggal PJUM".

- [ ] **Step 1: Perbaiki kondisi query di `queries.ts`**

Ubah file `app/admin/export/queries.ts` pada blok `filter.pjumStatus` menggunakan syntax `{ equals: null }` untuk mencegah *runtime error* Prisma.

```typescript
    if (filter.pjumStatus) {
        if (filter.pjumStatus === "SUDAH") {
            where.pjumExportedAt = { not: null };
        } else if (filter.pjumStatus === "BELUM") {
            where.pjumExportedAt = { equals: null };
        }
    }
```

- [ ] **Step 2: Menambahkan kolom pada header Excel di `route.ts`**

Buka `app/api/admin/export/route.ts` dan cari array `headers`. Tambahkan `"Status PJUM"`:

```typescript
    "Total Realisasi (Rp)",
    "Tanggal Selesai",
    "Status PJUM",
    "Tanggal PJUM",
  ];
```

- [ ] **Step 3: Menambahkan value untuk kolom pada baris Excel**

Di dalam `route.ts`, bagian `rows.map((r) => [ ... ])`, tambahkan logika untuk mengisi sel "Status PJUM":

```typescript
      numCell(r.totalEstimation),
      numCell(r.totalReal),
      dateCell(r.finishedAt),
      textCell(r.pjumExportedAt ? "Sudah PJUM" : "Belum PJUM"),
      dateCell(r.pjumExportedAt),
    ]),
```

- [ ] **Step 4: Commit perubahan**

```bash
git add app/admin/export/queries.ts app/api/admin/export/route.ts
git commit -m "fix(export): add status pjum column and fix prisma query"
```
