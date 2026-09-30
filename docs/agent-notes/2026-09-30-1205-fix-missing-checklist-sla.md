# Fix Missing SLA for Pending Checklist Review

## Scope

- Memperbaiki hilangnya kalkulasi SLA untuk status `PENDING_CHECKLIST_REVIEW`.
- Mengembalikan rancangan *widget* Distribusi Status & SLA murni ke Opsi 1 (Compact Visual Legend).

## Context and Sources

- Widget Distribusi Status sudah difinalisasi menggunakan Opsi 1.
- *Debugging* mengungkap bahwa status "Review Checklist" aktif di UI tapi sama sekali luput dari perhitungan SLA maupun database settings.

## Changed Files

- `app/dashboard/_components/admin/status-distribution.tsx` (reverted)
- `lib/app-settings.ts`
- `app/dashboard/_components/admin/sla-status-guide.tsx`

## Decisions

- Status `PENDING_CHECKLIST_REVIEW` diinjeksi ke dalam `DEFAULT_REPORT_SLA_DAYS` dan parameter konfigurasi lainnya di `lib/app-settings.ts` dengan batas waktu *default* 1 hari.
- Status ditambahkan secara visual pada komponen `SLA_STATUS_GUIDE` (panduan legenda).

## Verification

- Laporan yang nyangkut di "Review Checklist" sekarang akan masuk hitungan `overdueCount` dan indikator peringatan akan bekerja sebagaimana mestinya di dalam *Dashboard*.

## Remaining Work and Risks

- Tidak ada.
