# Fix Next.js Build Type Error and Deprecation

## Scope

Fixing a TypeScript type error in `lib/jobs/aho-import.ts` caused by `Uint8Array` not being assignable to `Buffer`, and removing the deprecated `experimental.after` config from `next.config.ts`.

## Context and Sources

- `npm run build` failed with a type error on `job.fileBuffer`.
- Next.js build output warned that `experimental.after` is no longer needed.

## Changed Files

- `lib/jobs/aho-import.ts`: Converted `job.fileBuffer` to `Buffer` using `Buffer.from()`.
- `next.config.ts`: Removed `after: true` from the `experimental` object.

## Decisions

- Explicitly wrap `job.fileBuffer` with `Buffer.from()` to satisfy the TypeScript compiler, since the underlying value behaves as a `Uint8Array`.
- Remove the deprecated `after` flag as it is now available by default in Next.js 16.2.

## Verification

- Ran `npm run build` which compiled successfully in 92s and passed all TypeScript checks.

## Remaining Work and Risks

None
