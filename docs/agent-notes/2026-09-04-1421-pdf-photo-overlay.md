# PDF Photo Label Overlay

## Scope

Menambahkan label status (Baik/Rusak/OK/Not OK) yang me-numpuk (overlay) di pojok kiri atas foto-foto galeri pada laporan PDF.

## Context and Sources

- Fitur "Laporan Lengkap PDF" baru saja selesai.
- Sesuai permintaan user, tampilan harus persis dengan UI di web (ada pill di kiri atas foto).

## Changed Files

- `lib/pdf/generate-report-pdf.ts`: Update type `ChecklistItemWithPhotos` dengan fields `condition` dan `preventiveCondition`. Update style dengan badge. Update rendering badge pada logic `renderDocPhotoTile`.
- `lib/pdf/checklist-photo-gallery.ts`: Update `ChecklistPhotoTile` dan map conditions saat di-flatten.
- `lib/pdf/report-pdf-full-builder.ts`: Map kondisi dari DB ke format baru.

## Decisions

- Overlay dibuat menggunakan `position: absolute` dari `@react-pdf/renderer` karena ini cara termudah membuat badge pill layaknya di web (mirip CSS).

## Verification

- Menjalankan unit test spec PDF rendering.

## Remaining Work and Risks

None
