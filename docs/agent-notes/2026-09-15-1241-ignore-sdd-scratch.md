# Ignore SDD Scratch Files

## Scope

Removes an accidentally tracked subagent progress report from Git and ignores local `.superpowers/` scratch files.

## Context and Sources

- During PJUM QR validator Task 2, `.superpowers/sdd/task-2-report.md` was accidentally included in the task commit.
- SDD progress and report files are local coordination artifacts and should not be tracked.

## Changed Files

- `.gitignore`: added `.superpowers/`.
- `.superpowers/sdd/task-2-report.md`: removed from Git tracking only.

## Decisions

- Keep SDD scratch files local while preserving them on disk for current-session coordination.

## Verification

- `git ls-files .superpowers` confirmed the accidental tracked file before cleanup.

## Remaining Work and Risks

None.
