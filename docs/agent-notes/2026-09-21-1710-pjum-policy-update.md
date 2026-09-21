# Enforce Mandatory PJUM for All Reports

## Scope

Memperbarui aturan bisnis agar semua laporan yang selesai diwajibkan untuk masuk PJUM (Pertanggungjawaban Uang Muka) tanpa memandang total biaya (meskipun Rp 0) atau ada/tidaknya penanganan BMS. Tidak mengubah layout PDF atau komponen UI.

## Context and Sources

- `lib/realisasi.ts`
- Spesifikasi desain: `docs/superpowers/specs/2026-09-21-pjum-policy-design.md`

## Changed Files

- `lib/realisasi.ts`: Mengubah fungsi `requiresPjum` agar selalu mengembalikan `true`.
- `lib/realisasi.spec.ts`: Memperbaiki unit test yang gagal akibat aturan baru.
- `lib/pjum-hanging.spec.ts`: Memperbaiki unit test yang gagal akibat aturan baru.

## Decisions

- Menggunakan pendekatan *feature-toggle* (komentar blok pada logika asli) untuk memudahkan pengembalian aturan jika diperlukan di masa depan.
- Rp 0 diizinkan lolos sampai tahap PDF resmi tanpa penyesuaian teks (biarkan tercetak Rp 0).

## Verification

- Unit tests (`npx vitest`) pass setelah diperbarui.
- Project ter-build dengan sukses.

## Remaining Work and Risks

None
