# Hybrid Client Autosave Hook

## Scope

Implemented Task 3 of the hybrid server draft plan: added the BMS client
server-draft autosave hook, wired checkpoint autosaves into the create form,
and added a photo-upload callback so successful uploads can flush photo
references to the server draft.

## Context and Sources

- `AI_RULES.md`
- `docs/superpowers/plans/2026-09-14-hybrid-server-draft.md`
- `docs/agent-notes/2026-09-14-2225-server-draft-autosave-contract.md`
- `app/reports/(bms)/create/create-form.tsx`
- `app/reports/(bms)/create/hooks/use-draft.ts`
- `app/reports/(bms)/create/hooks/use-photo-upload.ts`
- `app/reports/(bms)/create/hooks/draft-data.ts`

## Changed Files

- `app/reports/(bms)/create/hooks/use-server-draft-autosave.ts`: added the
  server autosave hook, `SERVER_DRAFT_IDLE_MS`, `shouldServerAutosave`, idle
  debouncing, pagehide best-effort flushing, and in-flight save guards.
- `app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts`: added
  the focused autosave timing/guard contract spec.
- `app/reports/(bms)/create/create-form.tsx`: wired server draft dirty
  tracking and checkpoint flushes for store selection, step navigation, and
  successful photo upload while leaving submit as the final source of truth.
- `app/reports/(bms)/create/hooks/use-photo-upload.ts`: added optional
  `onPhotoUploaded` and call it after a successful upload/checklist update.

## Decisions

- Server autosave remains disabled in edit/resubmit mode by passing an empty
  store code to the hook and skipping form dirty tracking there.
- The hook keeps latest form callbacks in refs so delayed checkpoint flushes
  read current form state rather than stale render data.
- A successful save only clears the dirty flag when no newer changes happened
  during the in-flight request.
- Photo autosave only flushes the already-uploaded `photoUrl` and `photoKey`
  from form state; it does not upload files.

## Verification

- `npx tsx "app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts"`
  failed because the global `npx` shim points to a missing npm CLI.
- `NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs' node_modules/.bin/tsx.cmd "app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts"`
  first failed with `Cannot find module './use-server-draft-autosave'`, as
  expected for the RED step.
- `NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs' node_modules/.bin/tsx.cmd "app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts"`
  passed with `server draft autosave contract tests passed`.
- `NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs' node_modules/.bin/tsx.cmd "app/reports/(bms)/create/hooks/draft-data.spec.ts"`
  passed with `draft-data tests passed`.

## Remaining Work and Risks

- `npx` remains broken in this local environment; verification used the
  repo-local `tsx.cmd` runner with the existing Node bootstrap workaround.
- Later plan tasks still own documentation updates and full hybrid draft
  workflow verification.
