# PJUM Package Spec Target Compatibility

## Scope

Fix the source-level PJUM package spec so it remains compatible with the current TypeScript target. Outside scope: runtime PJUM behavior, PDF rendering, and Prisma query changes.

## Context and Sources

- `lib/pdf/generate-pjum-package-pdf.spec.ts`
- Task 3 verification surfaced `TS1501` because the spec used the `/s` regex flag.

## Changed Files

- `lib/pdf/generate-pjum-package-pdf.spec.ts`: removed the `/s` regex flag from the store metadata source check.
- `docs/agent-notes/2026-09-16-1146-pjum-package-spec-target.md`: records this compatibility fix.

## Decisions

- The regex does not need dotAll behavior because the matched source pattern does not rely on `.` crossing newlines.
- Keeping the source test target-compatible prevents final TypeScript verification from failing on the test file.

## Verification

- `node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./lib/pdf/generate-pjum-package-pdf.spec.ts')"` passed with 2/2 tests.

## Remaining Work and Risks

- None.
