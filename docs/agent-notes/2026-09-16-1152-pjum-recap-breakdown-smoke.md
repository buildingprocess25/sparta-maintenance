# PJUM Recap Breakdown Smoke

## Scope

Add a focused standalone smoke fixture for the mixed-category PJUM recap
breakdown PDF. Outside scope: renderer behavior changes, grouping helper changes,
package query changes, canonical workflow/database documentation changes, and
production upload behavior.

## Context and Sources

- `AI_RULES.md`
- `.superpowers/sdd/task-4-brief.md`
- `docs/superpowers/plans/2026-09-16-pjum-store-type-breakdown.md`
- `docs/project/09-testing-and-verification.md`
- `docs/agent-notes/2026-09-16-1139-pjum-render-breakdown-after-signature.md`
- `docs/agent-notes/2026-09-16-1146-pjum-package-spec-target.md`
- `lib/pdf/generate-pjum-pdf.ts`
- `scripts/smoke-react-pdf-renderer.ts`

## Changed Files

- `scripts/test-pjum-recap-breakdown.ts`: added a mixed-category PJUM recap
  PDF smoke fixture that writes `scratch/pjum-recap-breakdown-smoke.pdf`.
- `docs/agent-notes/2026-09-16-1152-pjum-recap-breakdown-smoke.md`: records
  this required task note.
- `.superpowers/sdd/task-4-report.md`: records the Task 4 execution report.

## Decisions

- Created a dedicated script instead of modifying `scripts/test-pjum-form.ts` so
  the recap breakdown smoke remains focused.
- Reused the repo's existing standalone-test pattern for `server-only` by
  registering an empty cache entry before loading the PDF generator.
- Kept the `node_modules/.bin/tsx.cmd` command as the first smoke attempt and
  used the documented `process.geteuid` shim only after the known ENOMEM
  startup failure.
- Did not change renderer, helper, package, or package metadata files.

## Verification

- RED direct command
  `node_modules\.bin\tsx.cmd "scripts/test-pjum-recap-breakdown.ts"` failed
  with the known `uv_os_get_passwd returned ENOMEM` startup issue.
- RED workaround command
  `node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./scripts/test-pjum-recap-breakdown.ts')"`
  failed before implementation because the script file did not exist.
- After adding the script, the direct command still failed with
  `uv_os_get_passwd returned ENOMEM`.
- The workaround command passed and wrote
  `scratch\pjum-recap-breakdown-smoke.pdf`.
- `Get-Item scratch/pjum-recap-breakdown-smoke.pdf` reported a 5,175 byte PDF.
- TypeScript check
  `$env:NODE_OPTIONS='--max-old-space-size=8192'; node_modules\.bin\tsc.cmd --noEmit --incremental false`
  failed on the existing/out-of-scope stale `.next/dev/types/validator.ts`
  reference to `../../../app/v/pjum/[token]/page.js`.

## Remaining Work and Risks

- The direct `tsx.cmd` launcher remains blocked by the known Windows ENOMEM
  issue in this environment.
- Full TypeScript verification remains blocked by the stale `.next/dev`
  generated type reference.
- Manual visual review of `scratch\pjum-recap-breakdown-smoke.pdf` is still
  recommended before production deployment.
