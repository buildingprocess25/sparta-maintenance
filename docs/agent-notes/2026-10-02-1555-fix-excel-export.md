# Fix Excel Export Time Formatting

## Scope

- Menerapkan format waktu bawaan Excel (`[h]:mm:ss`) pada hasil export `.xlsx` di tabel SLA Proses.
- Mengubah pengiriman data nilai waktu dari string ke angka pecahan hari, agar Excel bisa memprosesnya sebagai data waktu valid.

## Context and Sources

- Diskusi `/brainstorming` yang menemukan masalah bahwa waktu lebih dari 24 jam atau dalam format teks string mengalami kendala saat di-sortir di Microsoft Excel.
- File yang dimodifikasi: `app/dashboard/branches/_components/admin-sla-table.tsx`

## Changed Files

- `app/dashboard/branches/_components/admin-sla-table.tsx`: Menambahkan fungsi `formatDurationExport` untuk mengonversi durasi ke format pecahan hari. Menambahkan looping menggunakan `XLSX.utils` untuk mengatur format cell (`cell.z = "[h]:mm:ss"`) di kolom durasi setelah dikonversi menggunakan `json_to_sheet`.

## Decisions

- Data tetap dirender sebagai string "HH:MM:SS" secara UI di frontend karena aman dan gampang dibaca, tetapi khusus ketika di-pass ke `json_to_sheet`, nilai diubah menjadi format number hari dan diterapkan format custom cell `[h]:mm:ss`.

## Verification

- Perubahan pada TypeScript kompilasi berjalan baik tanpa error syntax. Logika `json_to_sheet` didasarkan pada library sheetjs.

## Remaining Work and Risks

None.
