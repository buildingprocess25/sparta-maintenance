# Port Fitur Month Dropdown & Calendar Fix ke Dashboard PJUM

## Scope

Mem-port semua perubahan form Buat PJUM dari `/reports/pjum` ke modal "Buat PJUM" di `/dashboard/pjum`. Termasuk: dropdown bulan dengan auto-fill, calendar picker dengan visual block pada tanggal yang sudah ter-PJUM, toleransi 1 hari di ujung rentang (toDate lama bisa menjadi fromDate baru), dan pesan peringatan overlap.

Di luar scope: perubahan di Prisma schema (sudah selesai), approval-actions.ts, dan generate-pjum-package-pdf.ts (bersifat shared dan sudah selesai di task sebelumnya).

## Context and Sources

- Plan asli: `docs/superpowers/plans/2026-08-06-pjum-month-dropdown.md`
- Plan baru (dashboard port): artifact `implementation_plan.md` di session ini
- Referensi implementasi: `app/reports/pjum/_components/pjum-view.tsx` (sumber truth)

## Changed Files

- `app/dashboard/pjum/actions.ts`: Tambah type `DashboardPjumBlockedRange`, fungsi `getBlockedRangesForBms`, parameter `monthName` ke `createDashboardPjum`, validasi `monthName`, dan simpan ke DB.
- `app/dashboard/pjum/_components/create-pjum-dialog.tsx`: Tambah `DatePickerField` (Popover + Calendar dari shadcn), `findOverlappingRange` dengan toleransi 1 hari, `MONTH_OPTIONS` konstanta, state `monthName`/`blockedRanges`/`isLoadingBlockedRanges`, auto-fill bulan dari `toDate`, dropdown Bulan, overlap warning banner. Ganti `<Input type="date">` dengan calendar picker.

## Decisions

- Membuat `getBlockedRangesForBms` baru di `app/dashboard/pjum/actions.ts` (tidak reuse dari `app/reports/pjum/actions.ts`) karena kedua route punya auth context dan file server action terpisah.
- State `from`/`to` diubah dari `string` ke `Date | undefined` untuk kompatibilitas dengan komponen `DatePickerField` berbasis shadcn Calendar.
- `monthName` auto-fill diambil dari `toDate` yang dipilih (bukan `fromDate`) untuk menangani kasus periode lintas bulan — bulan terakhir periode yang lebih relevan untuk judul PJUM.

## Verification

- `tsc --noEmit` (dengan `--max-old-space-size=4096`) lulus 0 error setelah semua perubahan.
- Commits: `10514b2` (actions.ts), `ca8991c` (create-pjum-dialog.tsx).

## Remaining Work and Risks

Manual test end-to-end diperlukan untuk memverifikasi tampilan kalender, auto-fill bulan, dan PDF output. Dev server sudah berjalan di `http://localhost:3000`.
