# Hybrid Draft Submit Guards

## Scope

Added Task 5 regression checks for hybrid server draft submit semantics and report JSON cleanup. PJUM code was scanned but not changed.

## Context and Sources

- `AI_RULES.md`
- `docs/superpowers/plans/2026-09-14-hybrid-server-draft.md`
- `app/reports/actions/submit.ts`
- `app/reports/actions/report-json-helpers.ts`
- `app/reports/actions/report-json-helpers.spec.ts`

## Changed Files

- `app/reports/actions/submit-draft-source.spec.ts`: added source-level assertions that submit builds final items from the incoming payload and promotes drafts out of `DRAFT`.
- `app/reports/actions/report-json-helpers.spec.ts`: added explicit `BAIK` regression coverage for clearing stale handler, notes, and AHO ticket values.
- `docs/agent-notes/2026-09-14-2221-hybrid-draft-submit-guards.md`: task note for this change.

## Decisions

- Kept PJUM implementation unchanged because suspicious `DRAFT` inclusion should be reported rather than modified in Task 5 unless there is an obvious direct violation.
- Used the local `jiti` binary for TypeScript spec verification because `npx` is broken and local `tsx` hits an `os.userInfo()` environment failure in this environment.

## Verification

- `npx tsx "app/reports/actions/submit-draft-source.spec.ts"` failed because the global `npx` CLI is missing.
- `npx tsx "app/reports/actions/report-json-helpers.spec.ts"` failed because the global `npx` CLI is missing.
- Local runner verification was performed with `node_modules/.bin/jiti.cmd`.

## Remaining Work and Risks

None.
