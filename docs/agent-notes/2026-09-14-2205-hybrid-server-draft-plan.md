# Hybrid Server Draft Plan

## Scope

Created an implementation plan for hybrid server draft persistence for BMS report creation. No application code was changed.

## Context and Sources

- `AI_RULES.md`
- `docs/project/04-workflows.md`
- `docs/project/05-routes-and-ui.md`
- `docs/project/06-database.md`
- `docs/agent-notes/2026-08-06-1136-draft-created-at-fix.md`
- `docs/agent-notes/2026-08-26-2233-google-drive-hierarchy-implementation.md`
- `app/reports/(bms)/create`
- `app/reports/actions`
- User requirement: DRAFT reports shown on `/reports` must resume correctly, ideally across devices, without excessive server traffic or PJUM side effects.

## Changed Files

- `docs/superpowers/plans/2026-09-14-hybrid-server-draft.md`: implementation plan for hybrid localStorage plus server DRAFT autosave.
- `docs/agent-notes/2026-09-14-2205-hybrid-server-draft-plan.md`: task note for this planning change.

## Decisions

- The planned approach keeps localStorage as the fast same-device cache and adds checkpoint/idle server autosave for cross-device restore.
- Server idle autosave is planned at 17 seconds.
- Submit payload remains the final source of truth.
- `DRAFT` reports remain excluded from PJUM, realisasi, approval, export final, and finance dashboards.

## Verification

- Plan self-review completed for coverage, placeholders, and type consistency.

## Remaining Work and Risks

- Implementation has not started.
- Git commands are currently blocked by Windows safe.directory ownership checks in this environment.
