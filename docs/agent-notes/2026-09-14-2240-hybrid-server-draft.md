# Hybrid Server Draft

## Scope

Documented and summarized the completed hybrid server draft implementation for
BMS report creation. This note covers the full implementation across Tasks 1-6:
server-side DRAFT persistence, selected draft restore, client checkpoint
autosave, DRAFT list links, submit guard coverage, and canonical documentation.

## Context and Sources

- `AI_RULES.md`
- `docs/superpowers/plans/2026-09-14-hybrid-server-draft.md`
- `docs/project/04-workflows.md`
- `docs/project/05-routes-and-ui.md`
- Prior task notes in `docs/agent-notes/2026-09-14-*hybrid*`
- `app/reports/(bms)/create`
- `app/reports/_components`
- `app/reports/actions`
- Initial bug: `DRAFT` rows appeared in `/reports`, but clicking them did not
  restore the selected draft.

## Changed Files

- `app/reports/actions/types.ts`: added relaxed autosave validation for
  incomplete server draft checkpoints while keeping submit validation strict.
- `app/reports/actions/draft.ts`: added server draft save and selected draft
  restore behavior for current-user BMS `DRAFT` rows.
- `app/reports/actions.ts`: exported the server draft actions.
- `app/reports/actions/draft-autosave-schema.spec.ts`: added autosave schema
  contract coverage.
- `app/reports/actions/submit-draft-source.spec.ts`: added submit source
  guard coverage.
- `app/reports/actions/report-json-helpers.spec.ts`: added stale BMS handler
  cleanup coverage.
- `app/reports/(bms)/create/page.tsx`: loads the selected server draft when
  `restore=1&draft=<reportNumber>` is present.
- `app/reports/(bms)/create/hooks/use-draft.ts`: chooses between localStorage
  and server draft sources by saved timestamp.
- `app/reports/(bms)/create/hooks/use-draft-source.spec.ts`: covers draft
  source selection.
- `app/reports/(bms)/create/hooks/use-server-draft-autosave.ts`: added
  checkpoint and idle server autosave scheduling.
- `app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts`: covers
  the server autosave timing and guard contract.
- `app/reports/(bms)/create/hooks/use-photo-upload.ts`: flushes server draft
  after successful photo upload so uploaded photo references are checkpointed.
- `app/reports/(bms)/create/create-form.tsx`: wires server draft dirty
  tracking and checkpoint flushes for store, step, photo, idle, page leave, and
  submit behavior.
- `app/reports/_components/bms-reports-mobile.tsx`: links mobile `DRAFT` rows
  to the clicked draft report number.
- `app/reports/_components/bms-reports-list.tsx`: links desktop `DRAFT` rows
  and actions to the clicked draft report number.
- `app/reports/_components/bms-draft-links.spec.ts`: covers selected draft
  list links.
- `docs/project/04-workflows.md`: documented hybrid BMS draft persistence,
  checkpoint timing, photo reference saves, submit source, and exclusions.
- `docs/project/05-routes-and-ui.md`: documented the selected draft restore
  route and local-vs-server restore behavior.
- `docs/agent-notes/2026-09-14-2240-hybrid-server-draft.md`: final
  implementation summary note.

## Decisions

- `localStorage` remains the fast same-device cache for small form changes.
- Server writes are limited to meaningful checkpoints, a 17-second idle delay,
  photo upload completion, step changes, page leave best-effort, and submit.
- Photo autosave persists only `photoUrl` and `photoKey`; it does not re-upload
  files.
- Submit payload remains the final source of truth and can promote the DRAFT
  row out of `DRAFT`. If a server autosave is already in flight, submit waits
  for its result and uses the returned draft number so it does not leave a stale
  duplicate `DRAFT` row.
- `DRAFT` reports remain excluded from PJUM, realisasi, approval queues,
  completed exports, and finance dashboards.
- The selected draft route is
  `/reports/create?restore=1&draft=<reportNumber>`. Restore chooses the newer
  local/server source by saved timestamp so localStorage can win on the same
  device and server draft can restore on another device.

## Verification

- `npx tsx "app/reports/actions/draft-autosave-schema.spec.ts"` could not run
  because the global `npx` launcher is broken in this environment.
- `npx tsx "app/reports/(bms)/create/hooks/use-draft-source.spec.ts"` could
  not run for the same `npx` issue.
- `npx tsx "app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts"`
  could not run for the same `npx` issue.
- `npx tsx "app/reports/_components/bms-draft-links.spec.ts"` could not run
  for the same `npx` issue.
- `npx tsx "app/reports/actions/submit-draft-source.spec.ts"` could not run
  for the same `npx` issue.
- Bootstrap runner verification was used in prior task notes for the focused
  specs because local `tsx.cmd` needs the existing `patch-os-userinfo.cjs` and
  `tsx-bootstrap.cjs` workaround in this environment.
- Final focused verification after review fixes passed:
  - `app/reports/actions/draft-autosave-schema.spec.ts`
  - `app/reports/(bms)/create/hooks/use-draft-source.spec.ts`
  - `app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts`
  - `app/reports/_components/bms-draft-links.spec.ts`
  - `app/reports/actions/submit-draft-source.spec.ts`
  - `app/reports/actions/report-json-helpers.spec.ts`
- Targeted ESLint on touched application files passed.
- TypeScript verification with
  `NODE_OPTIONS=--max-old-space-size=8192 node_modules/.bin/tsc.cmd --noEmit --incremental false`
  passed.
- `node scripts/check-agent-task-note.mjs` passed.

## Remaining Work and Risks

- Full end-to-end browser verification with a real BMS login, real server
  draft row, and cross-device restore is still recommended.
- The global `npx` launcher remains broken locally; continue using the
  documented bootstrap runner workaround until the local Node/npm environment is
  fixed.
