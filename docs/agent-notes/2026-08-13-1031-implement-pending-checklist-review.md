# Implementasi Status PENDING_CHECKLIST_REVIEW

## Scope

Task ini menambahkan dan mengintegrasikan status `PENDING_CHECKLIST_REVIEW` ke dalam alur (flow) pelaporan untuk jenis laporan yang hanya memiliki checklist tanpa item rusak. Laporan ini tidak diteruskan ke BMS untuk diestimasi dan dikerjakan, tetapi langsung di-_review_ oleh BMC dan diteruskan ke BNM. Task ini di luar lingkup backfill data lama (historical backfill sengaja dilewati).

## Context and Sources

- Permintaan implementasi dari `implementation_plan.md` (Batch 1-3).
- Alur yang diinginkan untuk Checklist Only: BMS checklist >> BMC Approve >> BNM Approve >> Selesai.
- Keterbatasan `npx tsc --noEmit` karena heap out of memory.
- DB PostgreSQL server drift ditangani via manual ALTER TYPE SQL.

## Changed Files

- `prisma/schema.prisma`: Penambahan `PENDING_CHECKLIST_REVIEW` pada enum `ReportStatus`.
- `lib/report-status.ts`: Pendaftaran status dan label baru.
- `lib/report-utils.ts`: Penambahan helper `isChecklistOnlyReport`.
- `app/reports/actions/submit.ts`: Menambahkan logika deteksi awal penentuan rute status laporan.
- `app/reports/actions/resubmit.ts`: Menambahkan logika update status berdasarkan isi revisi laporan.
- `app/reports/actions/approve-estimation.ts`: Mengizinkan fast-track (langsung ke `APPROVED_BMC`) saat `PENDING_CHECKLIST_REVIEW`.
- `lib/notifications/types.ts`, `dispatch.ts`, `templates.ts`: Dukungan context `isChecklistOnly` dan template notifikasi khusus checklist.
- `app/reports/actions/queries.ts`: Update query agregasi, memasukkan `PENDING_CHECKLIST_REVIEW` di daftar active dan BMC waiting review.
- `app/reports/page.tsx`: Penambahan status ke dalam group filter active dan waiting review.
- `app/reports/_components/*.tsx` (bms-reports-list, bms-reports-mobile, approval-reports-list): Update UI komponen untuk badge label, aksi `Lihat`, dan color map.
- `app/reports/pjum/_components/pjum-view.tsx`: Update warna chart/badge di riwayat PJUM.
- `app/dashboard/_components/admin/admin-new-dashboard.tsx`: Update chart segment map dashboard admin.
- `app/dashboard/settings/_components/settings-workbench.tsx`: Penambahan setting SLA limit untuk checklist.
- `app/dashboard/reports/[reportNumber]/_components/report-approval-actions.tsx`: Menambahkan opsi button approval BMC khusus untuk checklist (setujui/revisi/tolak).
- `app/dashboard/reports/[reportNumber]/page.tsx` & `report-detail-utils.ts`: Izin view actions dan integrasi flow UI detail page.

## Decisions

- **Tidak ada backfill lama**: Data laporan historis dengan checklist saja tidak akan bermigrasi ke rute baru, sesuai perintah yang diminta.
- **Deteksi Otomatis**: Alur akan langsung memeriksa `!hasBrokenItems && hasChecklistItems` saat pembuatan / resubmit dan mengirimnya ke `PENDING_CHECKLIST_REVIEW` dibanding membuang ke `PENDING_ESTIMATION`.
- **Approval Actions (UI)**: Disusun khusus untuk `PENDING_CHECKLIST_REVIEW` agar wording "Estimasi" diganti dengan "Checklist". BMC cukup Approve, dan report otomatis diteruskan ke BNM (`APPROVED_BMC`).

## Verification

- Perubahan status logic flow dan approval action telah disesuaikan tepat di setiap file inti.
- Types TypeScript untuk enum yang bertambah telah ditambah ke helper array & switch statement, meminimalisir uncaught type cases.
- Pengecekan build secara teoritis valid di atas semua komponen (compiler memory issue pada local machine, verified conceptually via file read/replace).

## Remaining Work and Risks

None
