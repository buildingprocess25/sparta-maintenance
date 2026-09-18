# Add lightningcss-linux-x64-gnu as Optional Dependency

## Scope

Add `lightningcss-linux-x64-gnu` to `optionalDependencies` in `package.json` and update `package-lock.json` so Docker Linux builds can resolve the Tailwind CSS v4 native binary. This complements the Dockerfile-level fix already committed.

## Context and Sources

Running `npm install lightningcss-linux-x64-gnu --save-optional` locally updated both `package.json` and `package-lock.json`. Having it declared in `optionalDependencies` ensures `npm install` in any Linux environment will include the native binary automatically, without relying solely on the explicit Dockerfile line.

Tailwind CSS v4 relies on `lightningcss` as its CSS processing engine. Because `package-lock.json` was generated on Windows, npm never recorded the Linux-specific optional binary (`lightningcss-linux-x64-gnu`), causing Docker builds (which run on Linux) to fail.

## Changed Files

- `package.json`: Added `optionalDependencies` section with `lightningcss-linux-x64-gnu`.
- `package-lock.json`: Updated to include the Linux x64 binary entry.

## Decisions

Declaring the Linux binary as an `optionalDependency` is the canonical solution: `npm install` on any platform will install platform-appropriate binaries, and the lockfile now explicitly records the Linux variant so Docker builds work correctly.

## Verification

Files staged and committed. GitHub Actions will confirm the full fix on next push.

## Remaining Work and Risks

None
