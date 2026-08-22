# AHO Import Performance Fix

## Scope

Memperbaiki dua bug terpisah: (1) Event Loop Node.js membeku selama 7+ menit
karena XLSX.read berjalan synchronous di main thread, dan (2) banjir notifikasi
(infinity notif) karena setInterval menumpuk request polling yang kemudian
direspons serentak saat freeze selesai.

## Context and Sources

- Analisis log server 2026-08-21, sesi brainstorming 2026-08-22
- lib/jobs/aho-import.ts (kode lama)
- app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx

## Changed Files

- lib/jobs/aho-import-worker.ts: [NEW] Worker Thread script - semua CPU-intensive work berjalan di sini.
- lib/jobs/aho-import.ts: Ditulis ulang; hanya spawn Worker Thread, tidak ada blocking logic.
- app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx: Ganti setInterval dengan setTimeout rekursif + isPollingStoppedRef guard.

## Decisions

- Worker Thread dipilih karena built-in Node.js >= 18, tidak perlu dependency baru.
- Buffer dikirim ke worker via base64 encoding untuk keamanan serialisasi structured clone.
- isPollingStoppedRef.current diset true sebelum clearTimeout agar fetch yang sedang in-flight tidak memproses hasilnya setelah worker dihentikan.

## Verification

- npx tsc --noEmit: tidak ada error TypeScript
- npm run build: build sukses
- Manual test: upload file AHO, verifikasi toast muncul tepat 1x dan request polling berurutan

## Remaining Work and Risks

- Worker Thread menggunakan tsx/esm loader. Perlu verifikasi di production standalone build.
  Jika gagal, fallback: compile worker ke JS via tsc, atau ganti execArgv yang sesuai environment.
