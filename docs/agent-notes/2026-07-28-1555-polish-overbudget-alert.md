# Polish Overbudget Alert UI

## Scope

Refine the UI of the overbudget alert shown when an estimation exceeds the available balance in the BMS report creation flow.

## Context and Sources

- The user felt the previous alert was too wordy and cluttered.
- Addressed using the `impeccable` skill guidelines to implement a quieter, more compact design.

## Changed Files

- `app/reports/(bms)/create/create-form.tsx`: Replaced the bulky `Alert` component with a sleek, custom tailwind container with tighter padding, muted red colors, and more concise copy.

## Decisions

- Shortened the copy to focus on the exact over-budget amount.
- Replaced the harsh `border-red-500` with `border-red-200` to create a "quieter" visual impact, matching the app's professional product UI guidelines.

## Verification

- Alert now displays neatly without taking up excessive vertical space.

## Remaining Work and Risks

None.
