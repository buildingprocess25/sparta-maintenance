# Contextualize checklist notifications

## Scope

Updated notification wording for checklist-only reports and derived its context
from persisted report item handlers. Report workflow, approval callers, status
transitions, notification recipients, hrefs, entity/event types, stored actions,
schema, migrations, and database data are unchanged.

## Context and Sources

- `AI_RULES.md` and `AGENTS.md`.
- `docs/superpowers/specs/2026-08-14-contextual-checklist-labels-design.md`.
- `docs/superpowers/plans/2026-08-14-contextual-checklist-labels.md`.
- Recent contextual checklist notes through
  `docs/agent-notes/2026-08-14-1230-admin-report-history-context.md`.
- Current notification templates and dispatcher, `lib/report-utils.ts`,
  `@/types/report`, and the Prisma `Report.items` JSON schema.

## Changed Files

- `lib/notifications/templates.spec.ts`: covers checklist-only approval,
  revision, rejection, final-review copy, and unchanged BMS estimation copy.
- `lib/notifications/templates.ts`: supplies exact checklist-only wording while
  retaining the existing BMS-flow variants.
- `lib/notifications/dispatch.ts`: selects persisted items and passes only a
  derived checklist boolean plus scalar report data to notification creation.
- `docs/agent-notes/2026-08-14-1245-contextual-checklist-notifications.md`:
  records this scoped change.

## Decisions

- `isChecklistOnlyReport` is the source of truth because item handlers persist
  after report status changes, including BMC approval to `APPROVED_BMC`.
- The dispatcher retains item JSON only long enough to derive the boolean;
  `createAndPushNotifications` receives the existing scalar notification-report
  shape instead.
- Existing estimation and work wording remains the false branch, preserving
  BMS-handled report behavior.

## Verification

- RED: the focused template test failed as expected because checklist approval
  initially returned `Estimasi disetujui` rather than `Checklist disetujui BMC`.
- GREEN: the same focused template test printed
  `notification template tests passed` after implementation.
- Scoped ESLint passed through its local Node binary. The default-memory
  TypeScript process exhausted its heap; TypeScript was retried with a 4 GB
  Node heap and exited 0.
- Agent task-note assertions and `git diff --check` were run before commit.

## Remaining Work and Risks

None. The shell's `npx` wrapper is unavailable in this environment, so the
equivalent checked-in ESLint and TypeScript binaries were used for verification.
