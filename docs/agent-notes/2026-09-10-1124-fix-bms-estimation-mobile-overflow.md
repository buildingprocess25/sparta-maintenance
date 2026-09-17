# Fix BMS Estimation Mobile Overflow

## Scope

Memperbaiki overflow horizontal pada tabel dan dialog step estimasi form buat
laporan BMS. Perubahan hanya memengaruhi layout responsif dan tidak mengubah
state, validasi, atau payload estimasi.

## Context and Sources

- Screenshot pengguna pada step `3 / 4 Estimasi` dan dialog tambah estimasi.
- `AI_RULES.md`, `docs/project/05-routes-and-ui.md`, dan catatan terkait dialog
  serta material input tanggal 2026-07-28 dan 2026-08-16.
- Implementasi aktual `bms-estimation-step.tsx`, `report-wizard-shell.tsx`, dan
  primitive shadcn Table, Dialog, Select, serta Combobox.

## Changed Files

- `app/reports/(bms)/create/components/bms-estimation-step.tsx`: membatasi
  lebar card/table, memotong nama item panjang, dan membatasi seluruh isi
  dialog ke viewport.
- `app/reports/(bms)/create/components/report-wizard-shell.tsx`: menambahkan
  page, main, header, dan footer width containment.
- `docs/project/05-routes-and-ui.md`: mencatat kontrak responsif step estimasi.
- `docs/agent-notes/2026-09-10-1124-fix-bms-estimation-mobile-overflow.md`:
  catatan implementasi ini.

## Decisions

- Mempertahankan komponen shadcn yang sudah ada dan memperbaiki composition
  lokal; primitive global tidak diubah.
- Nama checklist panjang memakai truncate di dalam fixed table agar tidak
  menimpa subtotal.
- Dialog memakai dynamic viewport bounds, sedangkan field jumlah dan satuan
  menjadi satu kolom di bawah 360 piksel.
- Page-level `overflow-x-clip` hanya menjadi guard terakhir setelah child
  memperoleh `min-w-0` dan `max-w-full`.
- Sesuai permintaan pengguna untuk percepatan, tidak ditambahkan atau
  dijalankan regression test baru pada task ini.

## Verification

- Targeted ESLint untuk kedua file TSX yang berubah selesai dengan exit 0 dan
  tanpa warning.
- `git diff --check` selesai tanpa whitespace error.
- Source diperiksa terhadap screenshot: group label sekarang ter-clamp,
  Select/Combobox berada dalam bounded parent, dan grid field memiliki fallback
  satu kolom.

## Remaining Work and Risks

Tidak ada browser regression test atau full build yang dijalankan sesuai
permintaan percepatan. Smoke test pada perangkat target tetap disarankan
sebelum deployment production.
