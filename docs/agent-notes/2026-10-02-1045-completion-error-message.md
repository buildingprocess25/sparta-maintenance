# Fix Completion Form Error Message

## Scope

Fix the text of the toast error message shown when uploading completion photos fails so it displays the actual item name instead of "undefined". Retries for upload are out of scope.

## Context and Sources

- `docs/superpowers/specs/2026-10-02-completion-error-message-design.md`
- `app/reports/[reportNumber]/completion/use-completion-work-form.ts`

## Changed Files

- `app/reports/[reportNumber]/completion/use-completion-work-form.ts`: added `resolvedItemName` fallback to prevent "undefined" error text.

## Decisions

Used the same fallback logic for `itemName` as exists in the `validationErrors` block to maintain consistency within the file.

## Verification

- Typecheck using `npx tsc --noEmit` passed.

## Remaining Work and Risks

None.
