# Signage final-review fixes

## Scope

Harden server-side signage validation, make AHO ticket comparison case-insensitive, remove duplicated header comment. Nothing else.

## Context and Sources

`.superpowers/sdd/signage-final-fix-brief.md`; `app/reports/actions/types.ts`, `report-json-helpers.ts`, `lib/aho-ticket-groups.ts`, `local-aho-input.tsx`.

## Changed Files

- `app/reports/actions/types.ts`: signage data only with OK/NOT_OK (both modes); submit rejects `condition` and non-REKANAN handler on signage items.
- `app/reports/actions/report-json-helpers.ts`: drop signage fields unless signage item with OK/NOT_OK.
- `lib/aho-ticket-groups.ts`: tickets normalized to uppercase for locks/conflicts; group auto-fill keeps original string.
- `app/reports/(bms)/create/components/local-aho-input.tsx`: uppercase lock checks and manual commit.
- `lib/checklist-data.ts`: duplicate header line removed.
- Specs: types, report-json-helpers, aho-ticket-groups.

## Decisions

Autosave skips condition/handler checks since cooldown autosave serializes I-items with `condition`.

## Verification

Specs (types, report-json-helpers, aho-ticket-groups, signage-checklist, draft-autosave-schema) pass; `tsc --noEmit` clean outside .next.

## Remaining Work and Risks

None.
