# Preventive skip server enforcement

## Scope

Server-side handling of the preventive skip: submit validates eligibility and stores the flag, server drafts keep the flag, draft promotion overwrites it, and resubmitting a skipped report strips category I items.

## Context and Sources

- `docs/superpowers/specs/2026-10-29-skip-preventive-first-month-design.md`
- `docs/superpowers/plans/2026-10-29-skip-preventive-first-month.md` (Task 3)

## Changed Files

- `app/reports/actions/submit.ts`: `getPreventiveSkipBlocker` + `hasSkippedPreventiveThisQuarter` when `skipPreventive`; skip reports go through `resolvePreventiveSubmission` with `{ core: true, signage: true }` and skip the full A–H check; `preventiveSkipped` saved on create/promote; ActivityLog `SUBMITTED` notes `Preventif dilewati (bulan pertama kuartal)`.
- `lib/reports/drive-draft-service.ts`, `lib/reports/drive-draft-prisma-repository.ts`: `preventiveSkipped` on promote.
- `app/reports/actions/draft.ts`: draft selects, `DraftRecord`, `serializeDraft`, and `saveServerDraft` carry the flag.
- `app/reports/(bms)/create/components/types.ts`: `SerializedDraft.preventiveSkipped`.
- `app/reports/actions/resubmit.ts`: skipped reports drop category I items on resubmit; flag is never changed.

## Decisions

- An ineligible skip is rejected (`Preventif tidak dapat dilewati`) instead of silently becoming a full preventive report.
- Submit always passes the flag to promotion so a stale `true` from autosave is reset when the final submit is not a skip.
- `lib/preventive-cooldown.ts` is unchanged.

## Verification

- `npx tsx lib/preventive-cooldown.spec.ts`, `lib/reports/drive-draft-service.spec.ts`, `app/reports/actions/submit-draft-source.spec.ts` → pass.
- `npx tsc --noEmit` → only `preventiveSkipped` errors (Prisma Client not regenerated yet).

## Remaining Work and Risks

Client wiring (Tasks 4–5), badge (Task 6), and the developer-run Prisma migration.
