# Preventive skip card polish

## Scope

Visual touch-up of the checklist mode card in the BMS report form: card styling, a short hint that the skip option exists, and button styling. No logic changes.

## Context and Sources

- `docs/agent-notes/2026-10-29-1440-preventive-skip-ui.md`
- User feedback on screenshots of the checklist step (flat card, undo button looked like plain text).

## Changed Files

- `app/reports/(bms)/create/components/checklist-step.tsx`: gradient card with larger icon; amber card with `CalendarX2` icon when skipped; dashed hint box ("Sedang ada perbaikan urgent atau insidentil? ...") above a solid "Lewati Preventif" button with `SkipForward` icon; outline amber "Batalkan, isi checklist lengkap" button with `Undo2` icon, sized to its content.

## Decisions

- The hint text is short; the full limits explanation stays in the confirmation dialog.

## Verification

None, by user request (quick touch-up; not checked in the browser or with tsc).

## Remaining Work and Risks

Visual check in the browser, including dark mode.
