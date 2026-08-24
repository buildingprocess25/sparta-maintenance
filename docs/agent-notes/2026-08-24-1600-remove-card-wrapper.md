# Remove Preventive Card Wrapper

## Scope

- Removed the `<Card>` wrapper from `BmsPreventiveCard` to display the summary inline on the Dashboard.

## Decisions

- User requested to remove the card border/background because it consumed too much visual space. Using an inline `div` acts as a cleaner, native-feeling banner while retaining the progress bar concept.

## Verification

- Tested UI via `npm run dev`. No build errors.
