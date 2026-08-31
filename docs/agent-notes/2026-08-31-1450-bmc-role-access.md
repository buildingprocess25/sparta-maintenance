# Restrict BMC Role Access in Master Data User

## Scope

- Membatasi akses CRUD untuk role BMC di halaman Master Data User (UI maupun Backend).
- BMC hanya diizinkan untuk menambah, mengubah, atau menghapus user dengan role `BMS` dan `BRANCH_ADMIN`.
- Mengatur frontend agar membatasi pilihan role dropdown dan men-disable aksi Edit/Delete pada tabel user untuk role yang dilarang (Admin, BMC, BnM Manager) saat dilihat oleh user BMC.
- Menyesuaikan validasi fitur Bulk Import Data User agar patuh terhadap aturan yang sama, beserta penyesuaian teks panduan di UI modal dan contoh template Excel yang di-generate.

## Context and Sources

- `docs/project/03-roles-and-access.md`
- Implementasi existing dari `isGlobalAdmin`

## Changed Files

- `app/admin/database/_components/user-form-dialog.tsx`: Modifikasi opsi `roleOptions` untuk user BMC.
- `app/dashboard/users/_components/admin-users-table.tsx`: Menambahkan disabled logic (`cursor-not-allowed`) untuk tombol Edit dan Delete.
- `app/admin/database/actions.ts`: Validasi backend pada `adminCreateUser`, `adminUpdateUser`, `adminDeleteUser`, dan `adminImportUsers`.
- `app/admin/database/_components/import-user-dialog.tsx`: Modifikasi teks UI Langkah 1 dan logic export template XLSX untuk user BMC.

## Decisions

- Action button edit/delete didesain `disabled` dan transparan (bukan disembunyikan/dihilangkan) agar user BMC tahu bahwa entitas user tersebut ada, tetapi mereka tidak memiliki wewenang untuk mengotak-atiknya.
- Pada import masal, baris yang melanggar aturan ini di-*skip* (tidak memberhentikan proses secara keseluruhan) dan pesan error ditampilkan spesifik kepada NIK terkait pada daftar failed result. Hal ini sejalan dengan standard flow error-handling untuk bulk import.

## Verification

- Telah diverifikasi prop `allowAdminRole` di-_passing_ dengan benar dari halaman dashboard ke child components.
- Melalui pengecekan code review (dan test running dev server), validasi role pada logic API backend telah berfungsi mencegah bypass.

## Remaining Work and Risks

None
