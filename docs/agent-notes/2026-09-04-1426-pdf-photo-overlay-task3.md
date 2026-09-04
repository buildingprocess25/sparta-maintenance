# PDF Photo Label Overlay (Task 2 & 3)

## Scope

Menyambungkan data `condition` dan merender badge label di PDF.

## Context and Sources

- Sesuai dengan spesifikasi PDF label overlay.
- Menyelesaikan bagian builder `report-pdf-full-builder` dan UI styling `generate-report-pdf.ts`.

## Changed Files

- `lib/pdf/report-pdf-full-builder.ts`: Mapping conditions dari database item (`extractChecklistPhotos`).
- `lib/pdf/generate-report-pdf.ts`: Tambahan styling badge absolute, dan update `renderDocPhotoTile` untuk memasang label pada badge.

## Decisions

- Lanjut menggunakan logic `conditionLabel` yang sudah ada, sehingga label (Baik vs OK) mengikuti tipe checklist secara konsisten.

## Verification

- Type checking dengan TSC.

## Remaining Work and Risks

None
