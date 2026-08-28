# Drive Folder Ensure All Levels

## Scope

Change the Google Drive hierarchy resolver so missing branch, `Toko`, PJUM, and
nested folders are created on demand. Duplicate folder matches now reuse the
first folder returned by Google Drive instead of failing the upload flow.

## Context and Sources

- `AI_RULES.md`
- `AGENTS.md`
- `docs/project/07-integrations-and-env.md`
- `docs/agent-notes/2026-08-26-2233-google-drive-hierarchy-implementation.md`
- Current code and tests in `lib/google-drive/hierarchy-service.ts` and
  `lib/google-drive/hierarchy-service.spec.ts`

## Changed Files

- `lib/google-drive/hierarchy-service.ts`: changed branch and `Toko` resolution
  from required lookup to ensure-on-missing; duplicate code/name store matches
  now choose the first Drive result.
- `lib/google-drive/hierarchy-service.spec.ts`: updated resolver coverage for
  missing branch creation, missing `Toko` creation, and duplicate first-match
  behavior.
- `docs/project/07-integrations-and-env.md`: documented the new ensure/reuse
  behavior and duplicate first-match policy.
- `docs/agent-notes/2026-08-26-2233-google-drive-hierarchy-implementation.md`:
  appended the updated resolver decision to the ongoing Drive hierarchy note.

## Decisions

- Folder resolution should favor continuity of upload flows over strict
  ambiguity errors.
- Every folder level below the configured root follows the same rule: reuse an
  existing folder if present, otherwise create it.
- Duplicate direct children are not merged or renamed. The first returned Drive
  folder is used so the request can continue.

## Verification

- Esbuild `write:false` execution of `lib/google-drive/hierarchy-service.spec.ts`
  passed after the resolver change.
- Esbuild `write:false` execution of all focused Drive hierarchy specs passed:
  `lib/google-drive/hierarchy-policy.spec.ts`,
  `lib/google-drive/hierarchy-service.spec.ts`,
  `lib/reports/drive-draft-service.spec.ts`,
  `lib/google-drive/photo-upload-context.spec.ts`,
  `app/api/photos/upload/route.spec.ts`,
  `lib/hooks/use-photo-upload.spec.ts`,
  `lib/google-drive/report-archive.spec.ts`,
  `lib/jobs/cleanup-pending-reports.spec.ts`, and
  `lib/google-drive/cdn-client-config.spec.ts`.
- `git diff --check` passed.

## Remaining Work and Risks

- Duplicate folder first-match behavior can route files into whichever duplicate
  Google Drive returns first. Manual Drive cleanup is still recommended when
  duplicates are discovered.
- Repository-wide TypeScript and lint checks were not rerun for this follow-up;
  previous full-branch verification already documented unrelated pre-existing
  failures outside this Drive foldering change.
