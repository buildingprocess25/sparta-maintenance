# BMS Report Creation Guide Design

**Date:** 2026-07-28
**Status:** Approved design, pending implementation plan

## Problem

BMS creates and revises reports through a four-step mobile-first wizard, but
the key requirements are spread across its store, checklist, estimation, and
review screens. BMC and BNM already receive an in-product approval guide with
step navigation and a daily dismissal preference. BMS needs the same guide
experience for report creation without inheriting approval-specific UI or
logic.

## Goals

- Guide BMS through the existing report wizard in its natural order.
- Reuse the current Joyride behaviour and visual tooltip pattern used by BMC
  and BNM.
- Allow dismissal and suppress repeat display only for the current Jakarta
  date.
- Support both a new report and an estimation-revision report, which use the
  same form component.

## Non-goals

- Guide dashboard, report-detail, work-completion, or unrelated BMS pages.
- Add a database field, server action, or user preference record.
- Automatically fill, alter, or submit report data.
- Replace the existing User Manual.

## Approach

Create one BMS-specific client component beside the report-create wizard. It
uses the installed `react-joyride` dependency and the same tooltip behaviour
as `ApprovalReviewTour`, but has BMS-specific targets and copy. It does not
extend `ApprovalReviewTour`: approval-review selectors and status-based
storage are not meaningful in the BMS input flow.

## Guide flow

The tour starts only after the create-form wizard renders and its active step
is `store`. It guides a BMS user through these existing steps:

1. **Pilih toko** — search and select the affected store.
2. **Checklist dan foto bukti** — evaluate each required checklist item and
   attach the required evidence.
3. **Estimasi pekerjaan BMS** — add material/service details only for BMS
   handled damaged items.
4. **Review dan submit** — verify the report summary, then submit it to BMC.

The tour owns only its own display state. It renders one tooltip for the
wizard step the user has reached through the normal form navigation; its
controls close that tooltip but never move the wizard. The normal validation
remains authoritative, and the tour never bypasses a missing store, checklist
evidence, or estimation validation. If validation blocks progression, the
next guide step is not shown because its target is not rendered.

## UI and state

- Add stable `data-tour` attributes only to the existing BMS store search,
  checklist content, estimation action/content, review summary, and submit
  controls needed by the tour.
- Reuse the current overlay, back/next/skip controls, tooltip layout,
  accessibility handling, and body-scroll locking.
- Allow interaction with the highlighted form control while a BMS tooltip is
  open. This differs deliberately from the read-only BMC/BNM approval tour.
- Start automatically once the first BMS target is present; do not add a
  dashboard shortcut or persistent guide button in this scope.
- Use a BMS-specific localStorage key that scopes the daily dismissal to the
  BMS creation/revision guide. The value is the existing Jakarta date key.
- A skipped or finished tour writes the key only when the user selects
  “Jangan tampilkan lagi hari ini”, matching the BMC/BNM guide.

## Edit and revision behavior

A new report begins on the store step and receives the complete four-step
tour. Edit/revision reports begin on the checklist step because their store is
already fixed. Their guide starts at checklist and continues through
estimation and review; it does not attempt to return to store selection.

## Error handling

- Missing or delayed targets must not leave an overlay running indefinitely;
  the tour stops after the same bounded wait pattern used by the existing
  approval guide.
- If a target is unavailable for the current report mode, that step is
  omitted rather than highlighting an unrelated element.
- Browser storage failures or unavailable storage must leave the form usable;
  they only affect whether the tour repeats.

## Verification

Implementation verification must cover:

1. New BMS report flow starts at store and reaches the four intended targets.
2. Revision flow starts at checklist and omits store selection.
3. Next/back follows the wizard without bypassing existing validation.
4. Skip, finish, and daily-dismissal behaviour match BMC/BNM.
5. Mobile viewport keeps the target, tooltip, and fixed wizard footer usable.
6. Existing BMC/BNM approval tour remains unchanged.
7. Focused lint/typecheck/build and `git diff --check` pass.

## Acceptance criteria

- BMS sees an automatic, role-appropriate guide in the report wizard.
- The guide covers store, checklist evidence, BMS estimation, and review.
- New and revision flows show only steps that exist for their current mode.
- No report data, schema, or server contract changes are introduced.
