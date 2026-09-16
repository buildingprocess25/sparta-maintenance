# Task 4 Report: PDF Smoke Fixture

## Status

DONE_WITH_CONCERNS

## Scope

Created `scripts/test-pjum-recap-breakdown.ts` to exercise
`generatePjumPdf()` with mixed PJUM recap metadata and write
`scratch\pjum-recap-breakdown-smoke.pdf`.

No renderer, helper, package, or package metadata files were changed.

## Changes

- Added a focused smoke script with mixed rows:
  - Alfamart regular
  - Alfamart franchise
  - Lawson
- Added the repo's existing standalone script pattern for `server-only` so the
  server-only PDF module can be loaded from a Node smoke fixture.
- Added required task note:
  `docs/agent-notes/2026-09-16-1152-pjum-recap-breakdown-smoke.md`.

## Verification

### Initial RED attempt

Command:

```powershell
node_modules\.bin\tsx.cmd "scripts/test-pjum-recap-breakdown.ts"
```

Result: failed before loading the script with the known launcher issue:
`uv_os_get_passwd returned ENOMEM`.

### Initial workaround RED attempt

Command:

```powershell
node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./scripts/test-pjum-recap-breakdown.ts')"
```

Result: failed because `scripts/test-pjum-recap-breakdown.ts` did not exist.

### Direct smoke attempt after implementation

Command:

```powershell
node_modules\.bin\tsx.cmd "scripts/test-pjum-recap-breakdown.ts"
```

Result: failed before loading the script with the same known
`uv_os_get_passwd returned ENOMEM` issue.

### Workaround smoke attempt after implementation

Command:

```powershell
node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./scripts/test-pjum-recap-breakdown.ts')"
```

Result: passed and printed:

```text
Wrote D:\MAGANG-ALFA\sparta-maintenance\scratch\pjum-recap-breakdown-smoke.pdf
```

PDF check:

```powershell
Get-Item scratch/pjum-recap-breakdown-smoke.pdf | Select-Object FullName,Length
```

Result: `scratch\pjum-recap-breakdown-smoke.pdf` exists and is 5,175 bytes.

### TypeScript check

Command:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'; node_modules\.bin\tsc.cmd --noEmit --incremental false
```

Result: failed on an existing/out-of-scope stale Next generated type reference:

```text
.next/dev/types/validator.ts(458,39): error TS2307: Cannot find module '../../../app/v/pjum/[token]/page.js' or its corresponding type declarations.
```

## Concerns

- Direct `tsx.cmd` remains blocked by the known Windows ENOMEM issue, so smoke
  verification used the documented shim.
- The smoke script needed the repo's existing `server-only` cache shim before
  importing `generatePjumPdf()`; this is contained to the smoke fixture and did
  not require renderer changes.
- Full TypeScript verification is blocked by an existing stale `.next/dev`
  generated type reference.
- Manual visual review of the generated PDF is recommended.
