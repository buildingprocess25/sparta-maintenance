# Add @tailwindcss/oxide-linux-x64-gnu as Optional Dependency

## Scope

Add `@tailwindcss/oxide-linux-x64-gnu` to `optionalDependencies` in `package.json` and update `package-lock.json` so Docker Linux builds can resolve the Tailwind CSS v4 oxide native binary, alongside the previously added `lightningcss-linux-x64-gnu`.

## Context and Sources

Tailwind CSS v4 uses two Linux-specific native binaries:
1. `lightningcss-linux-x64-gnu` — already added in a prior commit
2. `@tailwindcss/oxide-linux-x64-gnu` — added in this commit

Both were stripped from `package-lock.json` during the merge of `feat/bms-balance` (Windows-generated lockfile). Declaring them as `optionalDependencies` ensures future lockfile regenerations on any platform will always include the Linux binaries.

## Changed Files

- `package.json`: Added `@tailwindcss/oxide-linux-x64-gnu` to `optionalDependencies`.
- `package-lock.json`: Updated to include the `@tailwindcss/oxide-linux-x64-gnu` Linux x64 binary entry.

## Decisions

Same rationale as the previous `lightningcss-linux-x64-gnu` fix — declaring platform-specific optional dependencies explicitly in `package.json` is the canonical way to ensure they are recorded in the lockfile on all platforms.

## Verification

Files staged. GitHub Actions will verify on next push.

## Remaining Work and Risks

None
