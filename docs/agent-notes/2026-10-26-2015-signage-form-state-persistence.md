# Signage form state, draft persistence, group AHO ticket sync

## Scope

Pure form-state transitions for signage items (I11-I13), group AHO ticket
fill/propagate helpers, serializing signage fields into draft/submit JSON, and
restoring them in draft, edit, and revision reopen paths. UI is out of scope.

## Context and Sources

`.superpowers/sdd/signage-task-5-brief.md`, `lib/signage.ts`,
`lib/aho-ticket-groups.ts`.

## Changed Files

- `create/hooks/signage-checklist.ts` (+spec): new pure helpers.
- `create/hooks/draft-data.ts` (+spec): serialize signage fields.
- `create/components/types.ts`: `SerializedDraft` signage fields.
- `actions/draft.ts`, `edit/[id]/page.tsx`, `revisi/[reportNumber]/page.tsx`: pass fields.
- `create/hooks/use-draft.ts`: restore in server and localStorage branches.

## Decisions

Helpers return the same Map instance when nothing changes.

## Verification

Both specs failed before and pass after; tsc clean (excluding .next types).
eslint reports one pre-existing set-state-in-effect error in use-draft.ts
(line ~84, not touched).

## Remaining Work and Risks

UI wiring of these helpers is a later task; browser check pending.
