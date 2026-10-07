# BMS Preventive Ranking and Stores Filter Cleanup

## Scope

- Memperbaiki hierarki Coverage BMS di checklist preventif (menghapus tombol bentangkan cabang, sub-filter toko, dan kolom aksi serta menyelesaikan isu double scrollbar).
- Menghapus filter BMS di halaman Manajemen Toko (`/dashboard/stores`).
- Mengarahkan tautan "Lihat semua" dan "Detail Preventif" di widget Checklist Preventif ke tab Coverage BMS.
- Menampilkan ranking 5 BMS Preventif Terbaik / Terburuk dengan tombol toggle sort pada dashboard BMC & BNM di widget Checklist Preventif.

## Context and Sources

- Permintaan user mengenai penyempurnaan UI Coverage BMS, perbaikan double scrollbar, pembersihan filter BMS di halaman toko, dan perankingan BMS untuk peran BMC & BNM.
- Model data `BmsStoreAssignment`, `Store`, `Report`, dan `User`.
- `app/dashboard/preventive/actions.ts`, `app/dashboard/_components/admin/preventive-kpi-widget.tsx`, `app/dashboard/stores/_components/admin-stores-table.tsx`.

## Changed Files

- `app/dashboard/_components/admin/preventive-kpi-widget.tsx`: Menambahkan ranking BMS untuk BMC/BNM dengan toggle Terbaik ↔ Terburuk, serta mengarahkan link ke tab coverage-bms.
- `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`: Menghapus tombol bentangkan cabang, filter toko, kolom aksi, dan memperbaiki double scrollbar.
- `app/dashboard/preventive/actions.ts`: Menghitung capaian preventif per BMS dari `BmsStoreAssignment` untuk manajer cabang (BMC/BNM).
- `app/dashboard/stores/_components/admin-stores-table.tsx`: Menghapus filter dropdown BMS dan state/parameter terkait.
- `app/dashboard/stores/page.tsx`: Menghapus props dan parameter filter BMS dari page store.
- `docs/plans/2026-10-07-bmc-bnm-preventive-bms-ranking-plan.md`: Catatan rencana implementasi.
- `docs/plans/task.md`: Pelacak progres tugas.

## Decisions

- Untuk BMC dan BNM yang terikat pada cabang mereka, widget Checklist Preventif menampilkan 5 BMS dengan capaian preventif terbaik/terburuk (hanya BMS yang memiliki target toko > 0).
- Kolom aksi pada tabel hierarki coverage BMS dihapus untuk menghindari ambiguitas operasional "Tutup Toko" dan mengandalkan interaksi baris klik / chevron.
- Double scrollbar diatasi dengan membatasi scroll vertikal ke container shadcn table.

## Verification

- `node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc --noEmit`: Exit code 0 (bersih tanpa error).
- `npm run build:memory`: Berhasil dikompilasi (Compiled successfully in 91s, generating 52/52 static pages, exit code 0).

## Remaining Work and Risks

None
