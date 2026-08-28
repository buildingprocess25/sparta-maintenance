# PJUM Hanging Carryover

## Scope

Implements the final one-PJUM tolerance for completed reports omitted from a
PJUM, removes the unfinished Regional unlock flow, explains carryover balance
deductions to BMS/BMC, protects BNM approval with an expiry confirmation, and
adds a read-only production cutover audit. Historical approved PJUMs are not
retroactively recalculated.

## Context and Sources

- `AI_RULES.md`
- `docs/project/04-workflows.md`
- `docs/project/06-database.md`
- `docs/project/10-bms-weekly-balance.md`
- `docs/superpowers/specs/2026-08-24-pjum-hanging-reports-phase-1-design.md`
- `docs/agent-notes/2026-08-24-1415-hanging-report-logic.md`
- Stakeholder decisions captured in the current task discussion.

## Changed Files

- `prisma/schema.prisma` and
  `prisma/migrations/20260828141000_add_pjum_hanging_lifecycle/migration.sql`:
  add nullable hanging and expiry timestamps.
- `lib/pjum-hanging.ts`, `lib/bms-balance-calculation.ts`, and tests: define
  one-cycle classification, expiry summary, and negative balance breakdown.
- `lib/balance.ts`: atomically approves PJUM, transitions periods, carries new
  omissions, expires old omissions, and exposes the balance breakdown.
- `app/dashboard/pjum/**` and `app/reports/pjum/**`: make active carryovers
  directly eligible, remove Regional unlock code, lock periods atomically,
  and require BNM expiry confirmation in both PJUM routes.
- `components/bms-balance-card.tsx` and `app/dashboard/_components/**`: explain
  hanging deductions and label hanging history.
- `scripts/audit-bms-balance-cutover.ts`, `lib/bms-cutover-audit.ts`, and test:
  add an aggregate-only, read-only cutover preflight.
- `docs/project/04-workflows.md`, `docs/project/06-database.md`, and
  `docs/project/10-bms-weekly-balance.md`: record the final business rules and
  go-live policy.
- `app/dashboard/settings/_components/settings-workbench.tsx` and report detail
  fixtures: clear pre-existing type errors exposed by full verification.

## Decisions

- Keep lifecycle fields on `Report`; no new carryover table.
- A report becomes hanging only when BNM approves the source PJUM.
- Carryover lasts until approval of the next PJUM, then settles or expires.
- `balancePeriodId` moves to the new period so existing balance accounting
  naturally includes the hanging realization.
- Negative available balance is valid and visible.
- Old date ranges remain blocked; active carryovers are added independently of
  the selected date range.
- Production cutover is non-retroactive. Existing `ACTIVE` and `LOCKED_PJUM`
  periods are preserved, and pending PJUMs use the new rule when approved.

## Verification

- Prisma Client generation succeeded with Prisma 7.9.1.
- Focused pure lifecycle, balance, and cutover assertions passed using Node's
  TypeScript stripping mode before imports were returned to project-standard
  extensionless form.
- `tsc --noEmit --pretty false --incremental false` passed with an 8 GB Node
  heap after generated-client and fixture fixes.

## Remaining Work and Risks

- Run lint and final diff checks after documentation edits.
- Production migration and cutover audit must be run against the intended
  datasource during a short BNM approval pause.
- The local `package-lock.json` was already modified before this task and was
  intentionally not reverted or attributed to this implementation.
