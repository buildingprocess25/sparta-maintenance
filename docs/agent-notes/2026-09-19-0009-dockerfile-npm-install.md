# Fix Docker Build for Tailwind/LightningCSS Native Module

## Scope

Fix GitHub Actions Docker build failing due to missing `lightningcss` Linux native binary. The `package-lock.json` was generated on Windows so `lightningcss-linux-x64-gnu` was never recorded in the lockfile, causing the build to fail inside a Linux container.

## Context and Sources

GitHub Actions build failed with `Cannot find module '../lightningcss.linux-x64-gnu.node'` during `npm run build` (Next.js 16 Turbopack + Tailwind CSS v4). Root cause: `lightningcss` declares its platform-specific binaries as `optionalDependencies`; npm on Windows skips the Linux ones and never records them in `package-lock.json`, so even `npm install` inside Linux Docker re-uses the lockfile and skips the Linux binary.

## Changed Files

- `Dockerfile`: Changed `RUN npm ci` → `RUN npm install`, then added `RUN npm install lightningcss-linux-x64-gnu --no-save` to explicitly install the Linux x64 native binary.

## Decisions

The cleanest fix without altering `package.json` or regenerating `package-lock.json` is to explicitly install the Linux-specific optional native package inside the Docker build layer. `--no-save` ensures it doesn't touch any local files.

## Verification

Change applied to Dockerfile. Actual verification will happen once pushed and GitHub Actions runs the Docker build.

## Remaining Work and Risks

None

