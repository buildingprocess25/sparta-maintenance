# Fix post-merge repair review findings

## Scope

Correct the post-merge legacy-branch repair review findings without executing
the repair against any database. The repair now refreshes PJUM areas only for
the legacy PJUM rows it found, and normalizes whitespace-only legacy areas.

## Context and Sources

- `docs/superpowers/specs/2026-07-31-post-merge-legacy-branch-repair-design.md`
- `scripts/merge-branch-scopes.ts`
- `lib/branch-merges.ts`
- Review of commit `1968222`.

## Changed Files

- `lib/branch-merges.ts`: add the normalized area fallback used by repair.
- `scripts/merge-branch-scopes.ts`: constrain repair-mode PJUM area refresh to
  the detected legacy PJUM IDs.
- `lib/branch-merges.spec.ts`: cover whitespace-only and padded area fallback.
- `scripts/merge-branch-scopes.spec.ts`: assert the targeted PJUM refresh path.
- BMC store dialog components: remove trailing whitespace only.

## Decisions

The ordinary branch-merge mode keeps its complete PJUM refresh. The explicit
post-merge repair mode passes only the PJUM IDs it selected, preventing an
unrelated area-name rewrite during repair.

## Verification

- Regression assertions failed before the implementation and passed after it.
- Ran focused branch-merge assertions and the merge-script self-test.
- No `--repair-post-merge --execute` command was run.

## Remaining Work and Risks

Production repair remains pending. Review the dry-run counts, back up the
database, and obtain explicit approval before executing the repair command.
