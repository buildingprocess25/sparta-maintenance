# SLA Dashboard Narratives, Filters, and Styling

## Scope

- Menambahkan narasi penjelasan pada widget Durasi Proses di Dashboard Admin (semua status laporan).
- Mengubah filter widget durasi menjadi per bulan (ytd default) bukan triwulan.
- Menambahkan narasi khusus pada tab SLA Proses (hanya laporan COMPLETED).
- Menyesuaikan style tab (TabsList dan TabsTrigger) pada halaman Performa Cabang menjadi bentuk underline (border-b-2) selaras dengan UI lainnya.

## Context and Sources

- Diskusi dengan stakeholder untuk tidak mengubah logic perhitungan existing (ytd default) namun ditambahkan narasi agar jelas bahwa dashboard widget menampilkan perhitungan berdasarkan semua laporan terlepas status akhirnya.
- Berkas `app/dashboard/_components/admin/process-duration-widget.tsx`
- Berkas `app/dashboard/preventive/actions.ts`
- Berkas `app/dashboard/branches/_components/admin-sla-table.tsx`
- Berkas `app/dashboard/branches/page.tsx`

## Changed Files

- `app/dashboard/preventive/actions.ts`: memperbarui argumen dan utilitas filter date pada fungsi `getAdminProcessDurationData`.
- `app/dashboard/_components/admin/process-duration-widget.tsx`: mengubah parameter `quarter` menjadi string `period`, memodifikasi component `Select` menjadi opsi bulan, menambahkan narasi, serta mempertebal ukuran font pada narasinya (text-sm font-semibold).
- `app/dashboard/branches/_components/admin-sla-table.tsx`: penambahan kalimat penjelasan bahwa durasi hanya berfokus pada laporan `COMPLETED`.
- `app/dashboard/branches/page.tsx`: modifikasi `className` pada struktur `TabsList` dan `TabsTrigger`.

## Decisions

- Tidak menyentuh logic underlying query `getAdminProcessDurationData`, hanya menyesuaikan argumen window (menggantikan utility `getJakartaQuarterWindow` menjadi `getActivityPeriodWindow`).
- Penyesuaian memori `npm run build` ke 8192 untuk kompilasi berhasil setelah error out-of-memory.

## Verification

- `npx tsc --noEmit` berhasil (clean type check).
- `npx cross-env NODE_OPTIONS=--max-old-space-size=8192 next build` berhasil.

## Remaining Work and Risks

None.
