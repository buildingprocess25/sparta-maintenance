# PJUM Confirmation Checkbox

## Scope

Menambahkan explicit checkbox summary di dialog "Buat PJUM" yang wajib dicentang
sebelum tombol submit aktif. Tidak ada perubahan backend.

## Context and Sources

- User feedback: banyak user BMC salah pilih periode (minggu/bulan) karena tidak
  ada konfirmasi sebelum proses jalan.
- Desain terpilih: Opsi 2 (Explicit Checkbox Summary) — memutus muscle memory
  tanpa modal bertumpuk.

## Changed Files

- "app/dashboard/pjum/_components/create-pjum-dialog.tsx": tambah state
  "isConfirmed", blok UI konfirmasi amber, reset lifecycle, dan modifikasi
  "disabled" pada tombol.

## Decisions

- State "isConfirmed" di-reset setiap kali: hasil search berubah, laporan
  di-toggle, atau dialog ditutup. Ini memastikan user selalu membaca ulang data
  terbaru sebelum submit.
- Blok konfirmasi hanya muncul ketika "canCreate === true" (minimal 1 laporan
  dipilih dan bulan sudah diisi) agar tidak mengotori UI saat form belum siap.
- Background amber dipilih untuk menarik perhatian secara visual (soft warning).

## Verification

- "npx tsc --noEmit" lulus tanpa error.
- Manual test: checkbox reset otomatis saat toggle laporan dan saat dialog
  ditutup/cek laporan ulang.

## Remaining Work and Risks

None.
