# Agent Task Note Hook Design

## Goal

Prevent normal local commits from omitting a required task note, regardless of
which branch is being worked on.

## Scope

Add a versioned Git pre-commit hook and a small validator. The hook applies to
all local branches once the repository configures `core.hooksPath` to
`.githooks`.

## Commit Rule

When staged changes contain a substantive file outside these paths, the staged
commit must add at least one non-template Markdown file under
`docs/agent-notes/`:

- `docs/agent-notes/**`
- `docs/superpowers/**`
- `.githooks/**`
- root agent-instruction files such as `AGENTS.md` and `AI_RULES.md`

The validator treats changes to these documentation/process paths as exempt so
the policy can maintain itself without recursive note requirements.

## Enforcement

- `.githooks/pre-commit` invokes the validator against staged files.
- The validator exits non-zero with an actionable message when a note is
  missing.
- A repository setup command runs `git config core.hooksPath .githooks`.
- `AGENTS.md` and `docs/agent-notes/README.md` document the setup command and
  the fact that `--no-verify` bypasses any local Git hook.

## Limits

The hook enforces normal commits, not intent. It cannot detect a project
decision made without changed files, and a deliberate `git commit --no-verify`
can bypass it. The existing task-note rule remains responsible for those cases.

## Verification

Use temporary staged files to prove three cases:

1. a substantive staged file with no task note fails;
2. a substantive staged file plus a dated task note passes; and
3. documentation/process-only staged changes pass.

Do not create a real commit during these checks.
