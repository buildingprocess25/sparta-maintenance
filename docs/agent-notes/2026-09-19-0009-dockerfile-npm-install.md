# Fix Docker Build for Tailwind/LightningCSS Native Module

## Scope

Change `npm ci` to `npm install` in the Dockerfile to ensure cross-platform optional dependencies (like `lightningcss` Linux binaries) are properly downloaded when building the image on a Linux container (GitHub Actions).

## Context and Sources

GitHub Actions build was failing with `Cannot find module '../lightningcss.linux-x64-gnu.node'` during `npm run build` of the Next.js app (using Turbopack). The `package-lock.json` was generated on Windows and did not include the Linux-specific binary. 

## Changed Files

- `Dockerfile`: Changed `RUN npm ci` to `RUN npm install` in the `deps` stage.

## Decisions

Replacing `npm ci` with `npm install` in the Dockerfile is the simplest way to allow npm to resolve and fetch the correct native bindings for the current OS (Linux x64) inside the container, overriding the strictness of the Windows-generated lockfile.

## Verification

Locally verified that the change is applied to the Dockerfile. The true verification will happen in GitHub Actions once pushed.

## Remaining Work and Risks

None
