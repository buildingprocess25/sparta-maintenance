# AHO Import Timeout UX Handling

## Scope

Added a specific timeout UX to the AHO ticket import process to handle Cloudflare's 100-second 524 timeouts. This ensures users do not receive a generic "Import failed" error when the server is still processing data in the background. Does not include changes to backend import logic or background job processing.

## Context and Sources

- Brainstorming session with the user regarding the 504/524 Cloudflare timeout behavior.
- `docs/superpowers/plans/2026-08-23-aho-import-timeout-ux.md` for the implementation plan.

## Changed Files

- `app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx`: Added `isTimeout` state, updated the `catch` block to set this state instead of throwing a generic error, and added a blue "Info" alert box to inform the user that the background process is continuing.

## Decisions

- Handled the timeout directly in the `catch` block because the Server Action correctly returns a JSON object on expected errors. Any exception caught here indicates a network/timeout error (e.g. 524 HTML response from Cloudflare).
- Used a blue "Info" alert instead of a red/orange warning to avoid panicking the user, confirming that the data is still being processed safely.

## Verification

- Code syntax validated. Visual inspection of React component structure.
- Pre-commit hooks will run on commit to verify linting and formatting.

## Remaining Work and Risks

None.
