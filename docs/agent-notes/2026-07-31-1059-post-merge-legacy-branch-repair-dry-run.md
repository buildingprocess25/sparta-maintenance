# Post-Merge Legacy Branch Repair Dry Run

## Scope

Execute the dry run of the legacy branch repair script against the staging database to verify the changes before production execution. Production writes are intentionally excluded.

## Context and Sources

- Tasks 1-3 of the Post-Merge Legacy Branch Repair plan
- `e:/APROJECT/sparta-maintenance/.superpowers/sdd/task-4-brief.md`

## Changed Files

- `docs/agent-notes/2026-07-31-1059-post-merge-legacy-branch-repair-dry-run.md`: Recorded the dry run results and production procedure.

## Decisions

- Executed the script in dry-run mode explicitly (`--repair-post-merge` without `--execute`).
- Verified all spec tests passed, and standard checks like typecheck and build passed before committing.

## Verification

Ran verification checks:
```powershell
npx tsx 'lib/branch-merges.spec.ts'
npx tsx 'app/bmc/database/legacy-branch-write-guard.spec.ts'
npx tsx 'app/bmc/database/store-area-options.spec.ts'
npx tsx 'app/bmc/database/store-area-validation.spec.ts'
npx tsx 'scripts/merge-branch-scopes.spec.ts'
npx tsx 'scripts/merge-branch-scopes.ts' --self-test
npm run test:agent-note
npx tsc --noEmit
npm run build
git diff --check
```
All passed.

Ran the repair script in DRY RUN mode against staging:
```powershell
npx tsx scripts/merge-branch-scopes.ts --repair-post-merge
```

Output:
```
(node:23516) [DEP0205] DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Mode: REPAIR DRY RUN
Stores to repair: 20
Reports to repair: 0
PJUM to repair   : 0
Jalankan dengan --repair-post-merge --execute untuk menyimpan perubahan.
```

## Remaining Work and Risks

Production Execution Procedure (requires separate approval):
1. Deploy the committed application guard first.
2. Run only the dry run against the intended production datasource:
   `NODE_ENV=production npx tsx scripts/merge-branch-scopes.ts --repair-post-merge`
3. Review aggregate counts and back up the production database.
4. Obtain explicit confirmation, then run:
   `NODE_ENV=production npx tsx scripts/merge-branch-scopes.ts --repair-post-merge --execute`
5. Re-run the dry run and confirm all three repair counts are zero.
