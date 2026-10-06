# Fix Store Code and Draft Report Number Mismatch

## Scope

- Fixed `saveServerDraft` action in `app/reports/actions/draft.ts` to invalidate existing draft and generate a fresh `reportNumber` with matching prefix when `storeCode` changes.
- Out of scope: In-memory React state reset on store change (intentionally preserved to prevent user checklist data loss) and edge case where user closes tab mid-store-change before auto-save fires.

## Context and Sources

- Discovered mismatch in report `W592-2609-003` where report number prefix (`W592`) mismatched DB store code (`W816`).
- Investigated `app/reports/actions/draft.ts` and `app/reports/new/hooks/use-checklist.ts`.

## Changed Files

- `app/reports/actions/draft.ts`: Added draft deletion and report number regeneration logic when incoming `storeCode` differs from existing draft's `storeCode`.

## Decisions

- When `storeCode` changes during draft auto-save, the existing draft record is deleted and a new `reportNumber` with correct prefix is generated via `ensureDriveDraftReport(storeCode)`.
- Kept checklist data in React state untouched on store change so user progress is not reset.

## Verification

- DB intervention executed for `W592-2609-003` (updated DB storeCode, regenerated Laporan & PJUM PDFs).
- `npm run build:memory` verified clean.

## Remaining Work and Risks

- None.
