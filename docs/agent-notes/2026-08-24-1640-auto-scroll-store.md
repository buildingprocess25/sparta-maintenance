# Auto-Scroll to Selected Store

## Scope

- Added logic in `StoreStep` (`app/reports/(bms)/create/components/store-step.tsx`) to auto-scroll the page to the pre-selected store card when the user is navigated from the Coverage dashboard.

## Decisions

- **DOM Rendering Check**: Since the store list is lazily loaded (5 at a time) for performance, we first expand the `visibleCount` to ensure the selected store is actually mounted in the DOM.
- **Scroll Timing**: We use a `setTimeout` with a short delay (300ms) after mount to allow the UI to fully paint before calling `scrollIntoView()`. This ensures the scroll smoothly centers on the card.
- **Run Once Flag**: A `useRef` tracks if auto-scroll has occurred, preventing weird scrolling behaviors if the component re-renders.

## Verification

- Clicked "Buat Laporan Preventif" from a store far down the list in Coverage dashboard.
- Verified the `store-step` mounts, expands the list to include the target store, and smoothly scrolls to center the card.
