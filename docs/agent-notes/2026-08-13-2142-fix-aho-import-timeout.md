# Fix: AHO Import Transaction Timeout

## Scope

Memperbaiki error timeout pada fungsi `adminImportAhoTickets` di fitur import XLSX tiket AHO.
Tidak menyentuh schema Prisma, UI dialog, atau return type fungsi.

## Context and Sources

- Error: `PrismaClientKnownRequestError` — "A batch query cannot be executed on an expired transaction. The timeout for this transaction was 30000 ms, however 32635 ms passed."
- File XLSX yang diimport mengandung ~191.000 baris; setelah filter status New/Progress menjadi ~9.000 baris aktif.
- Root cause: `prisma.$transaction(callback, { timeout: 30_000 })` dengan `Promise.all(N updates)` — meski tampak paralel, Prisma interactive transaction tetap sequential di bawahnya (satu koneksi DB), sehingga ~9.000 update queries meledak timeout.

## Changed Files

- `app/dashboard/aho-tickets/actions.ts`:
  - **XLSX Parser** (`parseFormatBXlsx`): Ganti `raw: false` + `sheet_to_json` (format 3.8M sel) dengan `raw: true` + direct cell access — hanya baca 5 kolom yang dibutuhkan per baris
  - Tambah helper `upsertAhoTickets()` — batch UPSERT chunked 1k rows via PostgreSQL `INSERT ... ON CONFLICT DO UPDATE`
  - Tambah `existingById` Map untuk lookup O(1)
  - Hapus seluruh blok `prisma.$transaction(callback)` + `Promise.all(update)`
  - Ganti dengan: `upsertAhoTickets(allIncoming)` (9 chunk × 1k rows) + `prisma.masterAhoTicket.deleteMany()`

## Decisions

- **PostgreSQL `INSERT ON CONFLICT DO UPDATE`** dipilih karena menggantikan N queries sequential dengan 1 roundtrip DB. Untuk 9k baris: estimasi < 5 detik vs 32+ detik sebelumnya.
- **`$queryRawUnsafe`** digunakan (bukan `$queryRaw` tagged template) karena placeholder array bersifat dinamis berdasarkan jumlah baris.
- **`xmax = 0` trick** untuk menghitung `created` vs `updated` secara akurat dari satu query RETURNING.
- **Tidak menggunakan interactive transaction** — UPSERT dan deleteMany masing-masing atomic. Risiko inkonsistensi sangat kecil untuk use-case snapshot sync YTD ini (tidak ada partial update yang berbahaya).
- **Tidak menaikkan timeout** — menaikkan timeout hanya menunda masalah; solusi struktural lebih baik.

## Verification

Perubahan diverifikasi secara struktural (kode review). Testing manual oleh user dengan file XLSX asli diperlukan untuk konfirmasi end-to-end.

## Remaining Work and Risks

- **Testing manual wajib**: User perlu upload file XLSX yang sama yang sebelumnya timeout dan konfirmasi dialog "Sinkronisasi Selesai" muncul dalam < 30 detik.
- **Idempotency check**: Import kedua kali dengan file yang sama harus menghasilkan `created=0, updated=0, deleted=0`.
- **Risk**: Jika PostgreSQL versi < 13, `gen_random_uuid()` mungkin tidak tersedia tanpa ekstensi `pgcrypto`. Di PostgreSQL 13+, ini built-in.
