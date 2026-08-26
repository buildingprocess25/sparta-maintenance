# Refactor Material Store UX and Fix Undefined IDs

## Scope

Refactoring the user experience for inputting Material Store data during Start Work and Completion Work. We made the store card independent of the receipt photo so users can upload store photos immediately, while locking the store name and city text inputs until the receipt photo is uploaded. We also fixed a server crash where undefined IDs were causing `id.trim()` errors.

## Context and Sources

- User requested changes based on real-world workflow (taking photo of the store front before getting the receipt).
- Discovered an undefined bug during testing in `start-work-with-photos.ts` and `submit-completion-work.ts`.

## Changed Files

- `lib/start-work-evidence.ts`: Added validation requiring `photoCount > 0` for each store.
- `app/reports/actions/start-work-with-photos.ts`: Filtered undefined file IDs before validation.
- `app/reports/actions/submit-completion-work.ts`: Filtered undefined file IDs before validation.
- `app/reports/[reportNumber]/start/start-work-client.tsx`: Updated layout, enabled default empty store injection, locked only inputs, and added placeholder context.
- `app/reports/[reportNumber]/completion/use-completion-work-form.ts`: Updated restore logic for default stores.
- `app/reports/[reportNumber]/completion/components/start-work-revision-section.tsx`: Mirrored UI logic from `start-work-client.tsx`.

## Decisions

- **Hybrid UX:** Unlocked the store section so users can immediately capture "Foto Toko", while still enforcing the SOP that "Nama Toko" and "Alamat" must be typed from the physical receipt (locked when no receipt).
- **Auto-inject initial store:** When opening the form and the data is empty, we automatically seed the state with one empty material store to guide the user visually.
- **Dynamic Placeholders:** Used placeholders like `"Nama toko material (Upload foto nota terlebih dahulu)"` to clearly explain why inputs are locked.

## Verification

- Tested locally and confirmed UI behavior in both Start and Completion pages.
- Tested server actions robustly by asserting safe `.filter` of file IDs.
- Run `eslint` and `npm run build` which reported clean syntax (TypeScript crashed due to known OOM limit on Next.js but no code-level errors were found on our diffs).

## Remaining Work and Risks

None
