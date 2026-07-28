# BMS Input Guide Revision Design

**Date:** 2026-07-28
**Status:** Approved design, pending implementation plan

## Problem

The current BMS report tour highlights broad wizard sections instead of the
controls users must operate. The store and review steps add no useful
guidance. Conditional checklist fields and the estimation action menu need
guidance only after the user makes the action that reveals them.

## Goals

- Remove guidance for store selection and review/submit.
- Give BMS a sequential, non-blocking guide for each checklist input.
- Explain the repair-only checklist flow without showing an unavailable
  condition selector.
- Guide the full BMS estimation flow, including adding, editing, and deleting
  an estimation entry.
- Keep all report input, validation, storage, and submit behavior unchanged.

## Non-goals

- Change checklist fields, estimation fields, validation rules, or their
  labels.
- Automatically choose a condition, handler, item, quantity, or price.
- Open dialogs, dropdowns, categories, or menus for the user.
- Add any database, server action, or persistent user-preference change.

## Approach

Replace the four broad wizard-step tour definitions with two contextual,
interaction-driven flows. The tour waits for each target to exist and pauses
between conditional stages; user actions reveal the next target. It remains
non-blocking, so the highlighted control stays usable while its tooltip is
shown.

Stable `data-tour` attributes identify the relevant checklist controls,
estimation controls, and action-menu items. The tour state observes target
availability rather than mutating form state.

## Checklist guide

The checklist tour applies to one visible checklist item and progresses in
this order:

1. **Kondisi** — shown only for a new report. It explains choosing Baik,
   Rusak, or Tidak Ada.
2. **Handler** — appears after the user selects Rusak; it explains choosing
   BMS or Rekanan.
3. **Foto bukti** — explains that a photo is required for the selected item.
4. **Catatan** — appears for Rusak and explains recording the problem.
5. **Nomor tiket AHO** — appears for Rusak and explains recording the ticket.

In repair-only mode, the item is already constrained to Rusak. The Kondisi
step is omitted and the guide starts at Handler, followed by Foto bukti,
Catatan, and Nomor tiket AHO.

If no item is marked Rusak, the guide ends after Kondisi. It must not wait
indefinitely for conditional fields or pressure the user to select Rusak.

## Estimation guide

The estimation tour applies only when at least one damaged item is assigned to
BMS. It progresses as follows:

1. **Tambah Barang** — explains that an estimation starts from this button.
2. **Pilih item rusak** — shown after the user opens the add-item dialog.
3. **Nama barang** — records the material or service.
4. **Jumlah dan satuan** — records quantity and unit.
5. **Harga satuan** — records the unit price; zero remains valid for items
   without tactical-fund spending.
6. **Simpan item** — explains saving the entry.
7. **Menu aksi** — shown after an entry exists; it explains opening the
   three-dot menu for changes.
8. **Edit** and **Hapus** — shown only after the user opens that menu and
   highlight the actual actions.

If there is no BMS-handled damaged item, the estimation guide is omitted.
If a user closes the add-item dialog or action menu before revealing the next
target, the guide stops cleanly for that visit.

## Lifecycle and dismissal

- A guide starts only after its first target is visible and no blocking dialog
  is open.
- Each tooltip is one contextual step; it does not navigate the report wizard
  or invoke any input action.
- Skip ends the current guide for the page visit. The existing checkbox keeps
  the Jakarta-date dismissal behavior and separate create/revision storage
  keys.
- The guide must release its overlay and body-scroll state whenever a target
  disappears, a dialog closes, or the user exits the page.

## Error handling

- Missing conditional targets stop the current guide instead of displaying an
  overlay without a target.
- Storage errors affect only repeat display; form interaction remains usable.
- Existing draft, camera, and estimation dialogs take precedence over a tour.

## Verification

Implementation verification must cover:

1. Store and review targets are absent from the BMS guide.
2. New-report checklist progresses through Kondisi, then Rusak-only fields.
3. Repair-only checklist starts at Handler and omits Kondisi.
4. Estimation targets appear in the documented add-item and action-menu
   sequence without programmatic form changes.
5. Closing a conditional dialog/menu stops the guide cleanly.
6. Draft dialog remains clickable and suppresses all tours.
7. Focused assertions, lint, typecheck, and `git diff --check` pass.

## Acceptance criteria

- The only BMS guides are actionable checklist and estimation guides.
- Every tooltip points to a concrete field or action, not a broad container.
- Conditional tooltip steps appear only when their controls exist.
- The tour never blocks controls, changes report data, or blocks a dialog.
