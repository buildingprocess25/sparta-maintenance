# Fix BMS guide review findings

## Scope

Restore runnable ESLint by aligning its version with the installed Next.js
lint plugins, and normalize the BMS guide implementation note to the required
template. Runtime guide behavior, schema, migrations, and deployment
configuration are unchanged.

## Context and Sources

- `package.json`
- `package-lock.json`
- `eslint.config.mjs`
- `docs/agent-notes/2026-07-28-1159-implement-bms-report-tour.md`
- ESLint error from `eslint-plugin-react@7.37.5`

## Changed Files

- `package.json`: pins ESLint 9.39.5.
- `package-lock.json`: resolves the compatible dependency graph.
- `eslint.config.mjs`: excludes versioned agent tooling from application linting.
- `app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts`: removes
  unused type imports reported by ESLint.
- `docs/agent-notes/2026-07-28-1159-implement-bms-report-tour.md`: follows
  the required task-note template.

## Decisions

- Use the latest available ESLint 9 release because the Next.js bundled React
  plugin supports ESLint through 9.x, not ESLint 10.
- Keep the existing Next.js lint configuration unchanged.
- Keep workflow files in scope; ignore only the tooling directories under
  `.github`.
- Keep the BMS tour assertion file lint-clean without changing its coverage.

## Verification

- Before: focused ESLint failed loading `react/display-name` because ESLint
  10 passed an incompatible rule context to the bundled React plugin.
- After: focused ESLint for all BMS guide and approval-tour files exited 0.

## Remaining Work and Risks

- `npm install` reported 31 dependency audit findings; they are pre-existing
  dependency maintenance work and are outside this focused lint repair.
- Full `npm run lint` now reaches application source, but still reports 21
  unrelated React-hook errors outside the BMS guide changes.
