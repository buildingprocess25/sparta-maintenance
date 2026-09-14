# Restore BMS Draft From Server

## Scope

Implemented Task 2 of the hybrid server draft plan: BMS create restore now loads a selected server draft by report number, falls back to the latest current-user server draft for `restore=1`, and chooses between localStorage and server draft sources by saved timestamp.

## Context and Sources

- `AI_RULES.md`
- `docs/superpowers/plans/2026-09-14-hybrid-server-draft.md`
- `docs/agent-notes/2026-09-14-2225-server-draft-autosave-contract.md`
- `app/reports/actions/draft.ts`
- `app/reports/(bms)/create/page.tsx`
- `app/reports/(bms)/create/hooks/use-draft.ts`

## Changed Files

- `app/reports/actions/draft.ts`: serializes latest and selected current-user BMS `DRAFT` rows into `SerializedDraft` shape.
- `app/reports/actions.ts`: exports `getDraftByReportNumber`.
- `app/reports/(bms)/create/page.tsx`: loads `draft=<reportNumber>` when present, otherwise loads the latest draft for `restore=1`.
- `app/reports/(bms)/create/hooks/use-draft.ts`: exports `chooseDraftSource` and chooses the newer local/server draft source.
- `app/reports/(bms)/create/hooks/use-draft-source.spec.ts`: covers local/server draft source selection.

## Decisions

- `getDraft()` now returns the same serialized draft shape as `getDraftByReportNumber()` because no current callers require the raw Prisma row.
- Server draft `updatedAt` is serialized as ISO so `chooseDraftSource()` can compare it with localStorage `savedAt` reliably.
- Rejected-report edit mode continues to skip local draft restore by using the existing `disableAutoSave` edit-mode signal.

## Verification

- `npx tsx "app/reports/(bms)/create/hooks/use-draft-source.spec.ts"` failed because the global `npx` launcher is unavailable in this environment.
- Bootstrap runner verified the new spec fails before implementation with `TypeError: chooseDraftSource is not a function`.
- Bootstrap runner verified `app/reports/(bms)/create/hooks/use-draft-source.spec.ts` passes.
- Bootstrap runner verified `app/reports/(bms)/create/create-form.draft-dialog.spec.ts` passes.

## Remaining Work and Risks

None.
