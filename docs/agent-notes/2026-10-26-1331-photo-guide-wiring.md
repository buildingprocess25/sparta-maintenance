# Wire photo guide into checklist form and completion page

## Scope

Gate the camera behind the photo guide dialog for catalog items tagged `photoGuide` (A22 KwH; A18, C6, E7, I3 Panel Listrik) in the BMS report wizard and the work-completion page, and add a "Lihat contoh foto" link. Signage items and other items are unchanged.

## Context and Sources

Task 11 brief; `components/photo-guide/*` (hook, dialog, link) and `lib/photo-guides.ts` from earlier tasks.

## Changed Files

- `app/reports/(bms)/create/components/checklist-step.tsx`: `onShowPhotoGuide` prop and link under item name.
- `app/reports/(bms)/create/create-form.tsx`: gate wraps `onOpenCamera`; renders `PhotoGuideDialog`.
- `app/reports/[reportNumber]/completion/components/completion-item-section.tsx`: optional `onShowPhotoGuide` link.
- `app/reports/[reportNumber]/completion/completion-client.tsx`: gate wraps item camera; link only when item has a guide; renders dialog.

## Decisions

Gating lives in the parents so non-guide items open the camera immediately (hook handles that).

## Verification

`npx tsc --noEmit` has no errors outside generated `.next` types. ESLint reports only pre-existing findings in untouched lines. Manual browser check pending.

## Remaining Work and Risks

Manual browser verification (Step 6) pending with the controller.
