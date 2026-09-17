# Sync Store Form Dialog State on Open

## Scope

Menambahkan `useEffect` pada komponen dialog form toko di Admin dan BMC untuk menyinkronkan state form dengan prop `editStore` ketika dialog dibuka dalam mode edit.

## Context and Sources

- User melaporkan bahwa setelah menambahkan toko (dengan tipe Franchise), ketika mengklik tombol edit, form masih menampilkan nilai lama (Regular) alih-alih data yang baru tersimpan.
- Komponen React `StoreFormDialog` memiliki key yang sama per baris, sehingga state dari `useState` tidak ter-reset secara otomatis ketika props berubah dari server actions.

## Changed Files

- `app/admin/database/_components/store-form-dialog.tsx`: Menambahkan import `useEffect` dan menerapkannya untuk mereset state saat dialog terbuka.
- `app/bmc/database/_components/store-form-dialog.tsx`: Menambahkan import `useEffect` dan menerapkannya untuk mereset state saat dialog terbuka.

## Decisions

- Tidak perlu memodifikasi query atau action database karena data di database (termasuk ownershipType) sudah tersimpan dan di-query dengan benar.
- Menggunakan `useEffect` dengan dependensi `[open, isEdit, editStore, branchNames]` untuk memastikan state disinkronkan tepat ketika dialog mulai muncul.

## Verification

- `npx tsc --noEmit` berhasil tanpa error TypeScript.

## Remaining Work and Risks

- None.
