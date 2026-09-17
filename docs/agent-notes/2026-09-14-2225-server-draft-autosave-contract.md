# Server Draft Autosave Contract

## Scope

Implemented Task 1 of the hybrid server draft plan: relaxed draft autosave validation and a server action for saving BMS-owned DRAFT report rows. Intentionally did not implement or export `getDraftByReportNumber`, which is deferred to Task 2.

## Context and Sources

- `AI_RULES.md`
- `docs/superpowers/plans/2026-09-14-hybrid-server-draft.md`
- `docs/agent-notes/2026-09-14-2205-hybrid-server-draft-plan.md`
- `app/reports/actions/types.ts`
- `app/reports/actions/draft.ts`
- `app/reports/actions.ts`
- `app/reports/(bms)/create/hooks/draft-data.spec.ts`

## Changed Files

- `app/reports/actions/types.ts`: added `draftAutosaveDataSchema` with relaxed damaged-item detail validation while keeping `draftDataSchema` strict for submit.
- `app/reports/actions/draft.ts`: added `saveServerDraft` for BMS-owned DRAFT autosave rows, including validation, CSRF, optional draft reservation, JSON persistence, and `/reports` revalidation.
- `app/reports/actions.ts`: exported `saveServerDraft`.
- `app/reports/actions/draft-autosave-schema.spec.ts`: added focused autosave schema contract coverage.

## Decisions

- Submit validation remains strict by default through the existing `draftDataSchema`.
- Autosave accepts incomplete damaged items so draft checkpoints can be saved before notes and AHO ticket numbers are filled.
- Autosave still rejects unknown checklist item IDs and estimation references.
- `saveServerDraft` updates only the current user's `DRAFT` row and returns an error when the target draft is missing.

## Verification

- `npx tsx "app/reports/actions/draft-autosave-schema.spec.ts"` failed because the global `npx` shim points to a missing npm CLI.
- `node_modules/.bin/tsx.cmd "app/reports/actions/draft-autosave-schema.spec.ts"` failed before executing tests due to `uv_os_get_passwd returned ENOMEM`.
- `NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs' node_modules/.bin/tsx.cmd "app/reports/actions/draft-autosave-schema.spec.ts"` passed with `draft autosave schema tests passed`.
- `NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs' node_modules/.bin/tsx.cmd "app/reports/(bms)/create/hooks/draft-data.spec.ts"` passed with `draft-data tests passed`.
- `node_modules/.bin/eslint.cmd "app/reports/actions/types.ts" "app/reports/actions/draft.ts" "app/reports/actions.ts" "app/reports/actions/draft-autosave-schema.spec.ts"` passed with no output.

## Remaining Work and Risks

- `npx` remains broken in this local environment; verification used the repo-local `tsx.cmd` runner with the existing Node bootstrap workaround.
- Task 2 still needs `getDraftByReportNumber` and selected draft restore behavior.
