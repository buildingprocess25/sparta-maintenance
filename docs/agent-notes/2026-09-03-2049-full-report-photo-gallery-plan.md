# Full Report Photo Gallery Plan

## Scope

Prepared an implementation plan to fix the "Laporan Lengkap PDF" documentation pages so checklist photos render as a compact cross-item gallery instead of one item per row.

## Context and Sources

- User confirmed the target layout is the compact gallery option: 4-6 photos per row, with item context preserved by a small caption.
- Screenshot showed generated documentation pages where item headers consumed a full row and many pages were needed.
- Reviewed `AI_RULES.md`, `docs/agent-notes/2026-09-03-1624-laporan-lengkap-pdf.md`, `lib/pdf/generate-report-pdf.ts`, `lib/pdf/report-pdf-full-builder.ts`, and `app/api/reports/[reportNumber]/pdf-full/route.ts`.

## Changed Files

- `docs/superpowers/plans/2026-09-03-full-report-photo-gallery.md`: Added the implementation plan.
- `docs/agent-notes/2026-09-03-2049-full-report-photo-gallery-plan.md`: Added this planning note.

## Decisions

1. The next implementation should flatten checklist photos into captioned photo tiles and paginate globally.
2. The gallery target should be 5 columns per row and 6 rows per page, capped at 3 documentation pages.
3. The temporary full PDF cache bypass should be removed during implementation.

## Verification

- Plan self-review completed for scope, placeholders, type names, and task coverage.

## Remaining Work and Risks

- Implementation has not started yet.
- Generated PDF still needs build and manual visual verification after code changes.
