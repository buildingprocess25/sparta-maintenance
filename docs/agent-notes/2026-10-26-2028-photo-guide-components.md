# Photo guide popup, gate hook, dan link

## Scope

Menambah tiga komponen reusable untuk contoh foto KwH/Panel Listrik:
dialog terkunci dengan hitung mundur, hook gate kamera, dan link "Lihat
contoh foto". Wiring ke halaman dilakukan di task berikutnya.

## Context and Sources

- `.superpowers/sdd/signage-task-10-brief.md`
- `.superpowers/sdd/signage-global-constraints.md`
- `lib/photo-guides.ts` (task 9): `PHOTO_GUIDE_COUNTDOWN_SECONDS`, `PhotoGuide`,
  `getPhotoGuideForItem`, `shouldGateCamera`.
- `components/ui/dialog.tsx`: prop `showCloseButton`.

## Changed Files

- `components/photo-guide/photo-guide-dialog.tsx`: dialog `PhotoGuideDialog`
  dengan mode `gate` (tombol konfirmasi disabled 5 detik setelah gambar
  tampil, tidak bisa ditutup saat terkunci) dan mode `view` (hanya lihat).
- `components/photo-guide/use-photo-guide-gate.ts`: hook `usePhotoGuideGate`
  yang menyimpan item yang sudah dilihat (state halaman saja).
- `components/photo-guide/photo-guide-link.tsx`: tombol link `PhotoGuideLink`.

## Decisions

- Kode mengikuti brief secara verbatim, termasuk indentasi 2 spasi.
- Gambar yang gagal dimuat tidak mengunci BMS (sesuai brief).

## Verification

- `npx tsc --noEmit`: hanya error pre-existing di `.next/dev/types/routes.d.ts`.
- `npx eslint components/photo-guide`: exit 0, tanpa temuan.

## Remaining Work and Risks

- Verifikasi manual di browser belum dilakukan (dikerjakan controller).
- Wiring ke halaman checklist menjadi task berikutnya.
