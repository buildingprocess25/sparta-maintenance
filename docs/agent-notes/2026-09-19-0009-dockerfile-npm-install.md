# Fix Docker Build: Restore lightningcss Linux Binary in package-lock.json

## Scope

Restore the missing `lightningcss-linux-x64-gnu` and `lightningcss-linux-x64-musl` entries in `package-lock.json` that were stripped during the merge of `feat/bms-balance`. Also declare `lightningcss-linux-x64-gnu` as an `optionalDependency` in `package.json` to prevent future regressions. The `Dockerfile` is restored to its original state (`npm ci`).

## Context and Sources

Root cause: when `feat/bms-balance` was merged into `main`, the `package-lock.json` from that branch (generated on Windows) **overwrote** the `main` lockfile and removed the Linux-specific `lightningcss` binary entries (`lightningcss-linux-x64-gnu`, `lightningcss-linux-x64-musl`). These had been present in the `main` lockfile at commit `65c47d5`. Without them, Docker builds (running Linux) failed with `Cannot find module '../lightningcss.linux-x64-gnu.node'`.

Confirmed by: `git show 65c47d5:package-lock.json | Select-String "lightningcss-linux-x64"` — entries were present. `git diff 65c47d5..6934d04 -- package-lock.json | Select-String "lightningcss-linux-x64"` — entries were deleted by the merge.

## Changed Files

- `package.json`: Added `optionalDependencies` with `lightningcss-linux-x64-gnu` to prevent future regressions.
- `package-lock.json`: Restored the missing Linux binary entries by running `npm install`.
- `Dockerfile`: Reverted back to `npm ci` (correct for CI/Docker). All previous intermediate changes to Dockerfile are undone.

## Decisions

The actual fix is restoring the lockfile entries. Adding `optionalDependencies` in `package.json` is a safeguard so future `npm install` runs on any platform will always record all platform binaries. `npm ci` is kept in Dockerfile as it is the correct, deterministic command for CI environments.

## Verification

Change applied to Dockerfile. Actual verification will happen once pushed and GitHub Actions runs the Docker build.

## Remaining Work and Risks

None

