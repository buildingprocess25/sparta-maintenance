# Pembatasan Akses Manajemen Toko BMC

## Scope

Tugas ini mengubah UI Manajemen Toko untuk role BMC (`app/bmc/database`) agar mereka tidak bisa menambah toko (manual maupun import) dan tidak bisa mengubah status aktif/nonaktif toko. Fitur ini tidak mengubah logic backend atau schema database, dan murni guardrail pada level UI. Tidak mempengaruhi halaman `app/admin/database`.

## Context and Sources

- Diskusi dan arahan dari Brainstorming untuk membatasi aksi BMC (Approach 1: menggunakan Toast Notification dan men-disable Select element).

## Changed Files

- `app/bmc/database/_components/store-table.tsx`: Mengganti form import dan tambah toko dengan button yang menampilkan instruksi toast "Akses Dibatasi".
- `app/bmc/database/_components/store-form-dialog.tsx`: Mendisable select input "Status Toko" ketika dalam mode Edit.

## Decisions

- Memilih menggunakan Toast notification agar tidak terlalu mengganggu alur UI (seamless) dibandingkan dengan modal Alert Dialog.
- Tombol tetap dibiarkan ada (visible) agar BMC tetap memiliki kesadaran bahwa fungsionalitas tersebut eksis namun hanya bisa dilakukan oleh Head Office.

## Verification

- Menjalankan `npm run lint` untuk memastikan tidak ada error syntax TypeScript/React.
- Validasi manual file component memastikan fungsionalitas tombol telah dimodifikasi dengan sempurna.

## Remaining Work and Risks

None
