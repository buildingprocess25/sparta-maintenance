# Direct Draft Restore

## Scope

Fix the BMS create report flow so opening `/reports/create?restore=1&draft=<reportNumber>` from the reports list restores that exact server draft without showing the draft-choice dialog. Outside scope: changing generic `/reports/create` draft detection or server autosave behavior.

## Context and Sources

- `app/reports/(bms)/create/page.tsx`
- `app/reports/(bms)/create/create-form.tsx`
- `app/reports/(bms)/create/hooks/use-draft.ts`
- `app/reports/(bms)/create/components/types.ts`
- `docs/project/05-routes-and-ui.md`

The screenshot showed `/reports/create?restore=1&draft=AHO8-2609-002` still rendering the "Draft Laporan Ditemukan" modal. That happened because localStorage draft selection still ran before direct server draft restore.

## Changed Files

- `app/reports/(bms)/create/page.tsx`: added a `forceServerDraftRestore` flag when a specific `draft` query parameter exists.
- `app/reports/(bms)/create/create-form.tsx`: passed the new flag into `useDraft`.
- `app/reports/(bms)/create/hooks/use-draft.ts`: skipped localStorage draft dialog logic when restoring a specific server draft.
- `app/reports/(bms)/create/components/types.ts`: added the new prop to the form type.
- `docs/project/05-routes-and-ui.md`: documented direct draft restore behavior.

## Decisions

- Keep localStorage-vs-server comparison for generic `/reports/create`.
- Ignore localStorage only for explicit `/reports/create?restore=1&draft=<reportNumber>` links, because that click is a direct instruction to open the selected draft.
- Do not delete localStorage during direct restore; it is simply not used for the popup decision.

## Verification

- `.\node_modules\.bin\eslint.cmd "app/reports/(bms)/create/page.tsx" "app/reports/(bms)/create/create-form.tsx" "app/reports/(bms)/create/hooks/use-draft.ts" "app/reports/(bms)/create/components/types.ts"`
- `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --incremental false`
- `node scripts/check-agent-task-note.mjs`

## Remaining Work and Risks

- None known.
