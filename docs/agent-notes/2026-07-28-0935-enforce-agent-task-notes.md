# Enforce agent task notes

## Scope

Add local Git enforcement for the existing task-note policy. Runtime code,
schema, migrations, and deployment configuration are unchanged.

## Context and Sources

- `docs/superpowers/specs/2026-07-28-agent-task-note-hook-design.md`
- `docs/superpowers/plans/2026-07-28-agent-task-note-hook.md`
- `AGENTS.md`
- `docs/agent-notes/TEMPLATE.md`

## Changed Files

- `scripts/check-agent-task-note.mjs`: validates staged paths.
- `scripts/check-agent-task-note.spec.mjs`: regression checks for required,
  compliant, and exempt changes.
- `.githooks/pre-commit`: invokes the validator before normal commits.
- `package.json`: exposes check, test, and hook setup commands.
- `AGENTS.md` and `docs/agent-notes/README.md`: document setup and limits.

## Decisions

- Require a dated note when staged changes include a substantive file.
- Exempt task-note, process-documentation, hook, and root agent-rule changes
  so policy maintenance does not recursively require a new note.
- Use `npm run setup:git-hooks` to configure `core.hooksPath` for all local
  branches.

## Verification

- Validator rejected staged substantive changes without a note.
- Unit-style regression checks cover missing, compliant, and exempt paths.
- Hook setup and staged validation passed after this note was staged.

## Remaining Work and Risks

- `git commit --no-verify` deliberately bypasses local Git hooks.
- A decision with no changed file remains governed by the documented rule.
