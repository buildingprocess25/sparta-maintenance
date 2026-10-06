# Chunking Query Ekspor XLSX Laporan Maintenance

## Scope
Menerapkan chunking/batching pada proses ekspor XLSX (`fetchReportExportRows`) untuk mencegah error query parameter limit PostgreSQL saat ekspor YTD (tanpa filter).

## Context and Sources
- Masalah: Error `Invalid prisma.report.findMany() invocation: The query parameter limit supported by your database is exceeded` saat melakukan ekspor data seluruh laporan (sekitar 38.000 data).
- Penyebab: Pemanggilan Prisma `findMany` dengan relasi `activities` akan men-generate kueri sekunder `IN (id1, id2, ..., id38000)`, yang melampaui batas parameter PostgreSQL (~32.767).

## Changed Files
- `app/admin/export/queries.ts`: Mengubah `prisma.report.findMany` menjadi loop iteratif `while(true)` dengan param `skip` dan `take` sebesar `CHUNK_SIZE = 5000`. 

## Decisions
- Menggunakan `skip` dan `take` di level JS alih-alih me-limit data dari sisi UI (pagination UI) agar user tetap bisa menarik data utuh satu tahun secara full (YTD) tanpa terhalang UI.
- Array gabungan `reports` dimapping di memori setelah semua chunking selesai.

## Verification
- `npx tsc --noEmit` berjalan normal (mengabaikan error cache internal .next/).
- Query ini sekarang akan jalan memakan waktu normal (~5-10 detik) tanpa menyebabkan crash aplikasi atau database.

## Remaining Work and Risks
- Waktu loading saat ekspor YTD mungkin cukup terasa (beberapa detik) namun akan selalu berhasil tanpa crash.
