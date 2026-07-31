# Post-Merge Legacy Branch Repair Design

## Goal

Repair stores, reports, and PJUM records created after the original branch merge with a legacy `branchName`, then prevent BMC store form and XLSX import from accepting legacy branch names again.

## Scope

This design adds an explicit post-merge repair mode to the existing branch-scope script and a shared legacy-branch guard for BMC store writes.

It does not add a database migration, infer area mappings from store names, alter historical rows that already use a canonical branch, or silently convert a new request to another branch.

## Canonical Mapping

The existing approved mapping remains the only source of truth:

| Legacy branch | Canonical branch |
| --- | --- |
| BOGOR, BEKASI, KARAWANG, CILEUNGSI 2 | CILEUNGSI RAYA |
| BALARAJA, SERANG, PARUNG, CIKOKOL | CIKOKOL RAYA |

Move that mapping from the script into a small shared module so the repair script and BMC application guard cannot drift.

## Repair Mode

Add `--repair-post-merge` to `scripts/merge-branch-scopes.ts`.

Without `--execute`, it is a read-only dry run that counts only rows whose current `branchName` is a legacy name. With both flags, it:

1. Changes each affected Store to its mapped canonical branch. If its `areaName` is null or blank, writes the original legacy `branchName` as its area. A non-empty existing area is preserved.
2. Changes each affected Report to its mapped canonical branch using the same null-or-blank area fallback.
3. Changes each affected PJUM export to its mapped canonical branch, then recomputes `areaNames` from the linked reports.
4. Does not update users, because existing user scope remediation belongs to the prior migration and this repair is limited to post-merge content records.

The repair mode must require an explicit `--execute`; no production write is allowed from normal application code.

## Prevention

Create a shared helper that recognizes legacy branch names after trimming. BMC store actions must reject a legacy `branchName` before authorization or database writes. The error tells the user to choose the mapped canonical branch and set the optional **Cabang Lama** field instead.

Apply the same guard to:

- create store;
- update store;
- XLSX store import target branch.

For the BMC store dialog and import dialog, filter legacy branches from writable branch options. Existing records with an old branch remain visible for repair, but cannot be edited through a write flow until repair has moved them to a canonical branch.

If a BMC has no canonical write branch after filtering, disable or hide the write controls with a clear message. Do not silently grant access to a mapped canonical branch from a stale `User.branchNames` value; that scope must be corrected deliberately.

## Error Handling

- Missing or unknown `branchName` keeps the existing validation behavior.
- A legacy input is rejected consistently in direct form submission, forged server-action payloads, and XLSX import.
- Repair dry run reports only aggregate counts and mapped branch names; it does not print store, report, PJUM, user, or backup data.
- The repair mode does not depend on old backup CSV files because its safe fallback is the explicitly selected legacy branch itself.

## Verification

- Unit-test mapping normalization and legacy-branch detection.
- Add behavior tests for direct store and import rejection through a pure branch write guard.
- Add script self-tests for the post-merge area fallback and dry-run flag parsing.
- Run focused tests, lint, TypeScript, agent-note validation, `git diff --check`, and a production build.
- Before production execution, run `npx tsx scripts/merge-branch-scopes.ts --repair-post-merge`, review aggregate counts, back up the database, then require explicit approval for `--repair-post-merge --execute`.

## Risks and Deferred Work

Stale `User.branchNames` values can still exist and will prevent affected BMC users from writing until their scopes are corrected. This is intentional: automatically expanding a stale legacy scope to a canonical branch could grant access beyond the user's intended legacy area. The original controlled scope migration remains the correct path for users.
