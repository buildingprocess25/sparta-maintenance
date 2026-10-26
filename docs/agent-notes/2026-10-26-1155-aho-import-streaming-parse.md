# AHO import: parse XLSX streaming di browser

## Scope

Memperbaiki import XLSX tiket AHO yang gagal ("Gagal melakukan sinkronisasi
(Kesalahan server)") untuk ekspor IRIS besar. Parsing dipindah ke browser
dengan unzip streaming; server action hanya menerima baris New/Progress.
Di luar cakupan: route `/api/admin/import-aho` dan `lib/jobs/aho-import*`
(tidak dipakai dialog, tidak diubah), logika sinkronisasi DB.

## Context and Sources

- `app/dashboard/aho-tickets/actions.ts`, `import-aho-tickets-dialog.tsx`
- `docs/superpowers/plans/2026-10-26-aho-import-streaming-parse.md`
- Catatan AHO import sebelumnya: 2026-08-21/22/23 di `docs/agent-notes/`

## Changed Files

- `lib/aho-import/import-payload.ts`: skema Zod + `normalizeAhoStatus` (dipakai client & server).
- `lib/aho-import/parse-aho-xlsx.ts`: parser streaming (fflate + scanner XML per `<row>`).
- `lib/aho-import/*.spec.ts`: test fixture (inline string, shared strings, chunk kecil, error).
- `scripts/smoke-aho-xlsx-parse.ts` + script `smoke:aho-xlsx`: smoke test ke file IRIS asli.
- `app/dashboard/aho-tickets/actions.ts`: hapus parser SheetJS; `adminImportAhoTickets(input: unknown)` memvalidasi payload.
- `app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx`: parse di browser, progress dua tahap.
- `package.json`, `package-lock.json`: dependensi `fflate`.

## Decisions

- Akar masalah: sheet XML ekspor IRIS 26 Okt 2026 = 565.192.737 karakter, di atas
  batas string V8 (536.870.888). SheetJS 0.18.5 menelan error dan mengembalikan
  `Sheets = {}`, lalu `ws["!ref"]` melempar TypeError.
- Parse di browser (bukan server/background job) agar payload kecil (~1,2 MB untuk
  ~10,6k baris aktif), tidak menyentuh batas `bodySizeLimit` 70 MB, dan tidak
  menambah beban memori/infra server.
- Dua pass unzip karena `sheet1.xml` berada sebelum `workbook.xml` di zip IRIS.
- Mendukung inline string (ekspor IRIS) dan shared strings (file disimpan ulang dari Excel).
- Tanggal Cetak diparse manual sebagai WIB agar konsisten antar browser.

## Verification

- `npx tsx lib/aho-import/import-payload.spec.ts` → passed
- `npx tsx lib/aho-import/parse-aho-xlsx.spec.ts` → passed
- `npm run smoke:aho-xlsx -- <file IRIS 26 Okt 2026>` → 25,2 dtk, totalRows 246.176,
  skippedNonActive 235.530, activeRows 10.646, payload 1.191 KB, schema valid,
  printDate 2026-10-26T02:08:52.000Z
- `tsc --noEmit` → tidak ada error di file yang diubah (error tersisa hanya di
  `.next/dev/types/validator.ts` yang basi)
- `eslint` file terkait → tidak ada error baru (3 error `no-explicit-any` di
  `actions.ts` sudah ada sebelumnya pada fungsi create/update/delete tiket)
- `npm run build:memory` → sukses, setelah `.next/dev/types` basi (berisi route
  `/pengajuan-harga` dari branch lain) dipindahkan keluar repo
- Uji manual dialog import di browser → belum dilakukan (butuh login ADMIN)

## Remaining Work and Risks

- Uji manual import di browser terhadap DB lokal.
- `app/api/admin/import-aho/**` dan `lib/jobs/aho-import-worker.ts` masih memakai
  parser SheetJS lama dan akan gagal dengan file besar bila diaktifkan lagi.
- Parsing ~25 detik di browser untuk file 72 MB; akan bertambah seiring data YTD.
