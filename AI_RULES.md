## AI Coding Rules

Aturan wajib yang harus diikuti oleh semua AI agent saat mengerjakan project ini:

### 1. Prioritaskan Komponen shadcn/ui

- **Selalu gunakan komponen shadcn/ui terlebih dahulu** sebelum menulis markup custom.
- Jika ada referensi UI dari user untuk ditiru, **analisa dulu** strukturnya, lalu **cari apakah komponen ekuivalennya tersedia di shadcn** (gunakan `npx shadcn@latest search` atau `npx shadcn@latest docs`).
- Jika komponen tersedia di shadcn → **import dan gunakan dari shadcn**, jangan buat ulang dari scratch.
- Jika komponen **tidak tersedia** di shadcn → baru diizinkan membuat komponen kustom.

### 2. Komponen Kustom Harus Reusable

- Jika terpaksa membuat komponen kustom, **selalu buat sebagai komponen yang reusable** (terima props, tidak hardcode value spesifik).
- Simpan di path yang sesuai (`@/components/`) dengan nama yang deskriptif.
- Hindari membuat komponen one-off yang hanya bisa dipakai satu tempat.

### 3. Jangan Tambah Spacing Manual ke Komponen shadcn

- **Jangan menambahkan padding, gap, margin, atau style jarak lainnya secara manual** ke dalam atau di antara komponen shadcn/ui.
- Komponen shadcn sudah memiliki spacing bawaan yang telah dikalibrasi — menambah spacing manual akan merusak konsistensi visual.
- Ini berlaku untuk: `Card`, `CardHeader`, `CardContent`, `CardFooter`, `Button`, `Input`, `Dialog`, `Sheet`, dll.
- Jika butuh jarak antar elemen, gunakan layout wrapper (misal `flex flex-col gap-4`) hanya pada elemen container, bukan pada komponen shadcn itu sendiri.
