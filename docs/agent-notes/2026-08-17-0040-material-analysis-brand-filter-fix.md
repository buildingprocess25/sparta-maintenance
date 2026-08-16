# Material Analysis Brand Filter Fix

## Scope
- Memperbaiki filter brand pada Material Analysis agar menggunakan konstanta `STORE_BRAND_OPTIONS` dengan benar.
- Menghapus opsi duplikat "Semua Brand" yang menyebabkan kebingungan.
- Menyelaraskan default value `brand` menjadi `"ALL"` di `client.tsx` dan `export-dialog.tsx`.
- Mengubah logika validasi di `actions.ts` agar memeriksa `brand !== "ALL"`.

## Changed Files
- `app/admin/material-analysis/actions.ts`
- `app/admin/material-analysis/client.tsx`
- `app/admin/material-analysis/export-dialog.tsx`
