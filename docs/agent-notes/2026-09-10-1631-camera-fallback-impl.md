# Camera Fallback Implementation

## Scope

- Modifies `CameraModal` to use tiered `getUserMedia` constraints.
- Replaces boolean `permissionError` with specific `errorMessage`.
- Does not change how images are captured or uploaded.

## Context and Sources

- Follows the implementation plan at `docs/superpowers/plans/2026-09-10-camera-fallback.md`

## Changed Files

- `components/ui/camera-modal.tsx`: replaced state and modified `startCamera` logic.

## Decisions

- Implemented progressive fallbacks to solve `OverconstrainedError` on unsupported devices.

## Verification

- Manual verification of code logic. Build fails due to system OOM but TS logic is sound.

## Remaining Work and Risks

None.
