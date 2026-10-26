# Signage server validation and preventive completeness

## Scope

Server-side zod validation for signage items (I11-I13), grouped AHO ticket
conflict check, persisting signage fields into item JSON, full category I
check on quarterly submit, and first zod message in submit/resubmit errors.
UI is out of scope.

## Context and Sources

`.superpowers/sdd/signage-task-4-brief.md`, `lib/signage.ts`,
`lib/aho-ticket-groups.ts`.

## Changed Files

- `types/report.ts`: `signageMaterial`, `signageCondition` on `ReportItemJson`.
- `app/reports/actions/types.ts`: type + zod fields, signage refinements, AHO conflict check.
- `app/reports/actions/report-json-helpers.ts`: pass signage fields to items JSON.
- `app/reports/actions/submit.ts`: require all category I items; show first zod message.
- `app/reports/actions/resubmit.ts`: show first zod message.
- `types.spec.ts`, `report-json-helpers.spec.ts`: new assertions.

## Decisions

AHO conflict check runs only when `requireDamagedDetails` (not on autosave).

## Verification

Both specs failed before the change and pass after; submit-draft-source and
draft-autosave-schema specs pass; tsc and eslint clean (excluding .next types).

## Remaining Work and Risks

None.
