# Photo guide data for KwH and panel items (Signage Task 9)

## Scope

Add the photo guide catalog data and gate decision helper: `photoGuide` tags on A18, A22, C6, E7, I3, two example PNGs under `public/assets/photo-guides/`, and `lib/photo-guides.ts`. UI popup/countdown components are out of scope and come in later tasks. Item names and IDs are unchanged.

## Context and Sources

`.superpowers/sdd/signage-task-9-brief.md`; `.superpowers/sdd/signage-global-constraints.md`; `lib/checklist-data.ts`.

## Changed Files

- `lib/checklist-data.ts`: `PhotoGuideKey` type, `photoGuide?` on `ChecklistCatalogItem`, tags on A18, A22, C6, E7, I3.
- `lib/photo-guides.ts`: `PHOTO_GUIDE_COUNTDOWN_SECONDS`, `PHOTO_GUIDES`, `getPhotoGuideForItem`, `shouldGateCamera`.
- `lib/photo-guides.spec.ts`: spec for guide lookup, gate decision, and asset existence.
- `public/assets/photo-guides/kwh.png`, `public/assets/photo-guides/panel-listrik.png`: example images copied from the slide exports.

## Decisions

Gate is per item per page through `seenItemIds`, so the helper stays pure. Asset existence is checked against `public/` by the spec.

## Verification

`npx tsx lib/photo-guides.spec.ts` prints `photo guide tests passed`. `tsc --noEmit` shows no errors outside `.next/`. ESLint on the touched files is clean.

## Remaining Work and Risks

Popup and countdown UI (later tasks). Visual check of the guide images is pending in the browser.
