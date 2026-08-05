# Fix Build Type Errors

## Scope

Fixed various TypeScript errors that prevented `npm run build` from succeeding, including missing properties in types, incorrect relative paths, missing variables in Promise.all destructuring, and missing type declarations for external libraries.

## Context and Sources

The task originated from user encountering build errors during `npm run build`. The errors pointed to module resolution issues, missing `areaNames` type properties, missing `allBrands` in destructuring, and implicit `any` types.

## Changed Files

- `app/admin/database/page.tsx`: Fixed relative path for `queries` import and added `allBrands` to `Promise.all` destructuring.
- `app/admin/database/_components/user-table.tsx`: Added missing `areaNames: string[]` to `UserRow` type.
- `app/api/dev/drive-proxy/route.ts`: Added explicit `any` type to `file` in `.map()` callback.
- `app/bmc/database/page.tsx`: Fixed relative path for `queries` import and added `allBrands` to `Promise.all` destructuring.
- `app/bmc/database/_components/user-table.tsx`: Added missing `areaNames: string[]` to `UserRow` type.
- `types/tabler-icons-react.d.ts`: Added custom type declaration to fix implicit any error for `@tabler/icons-react`.
- `package-lock.json`: Updated lockfile due to `npm install` run by the user.

## Decisions

- **Relative Paths**: Corrected `../admin/database/queries` to `../../admin/database/queries` so they correctly resolve across folders.
- **Type Definitions**: Added `areaNames` directly to the `UserRow` to match the data passed by `AdminUserFormDialog` and `UserFormDialog`.
- **Tabler Icons**: Rather than modifying dependencies for `@types/tabler__icons-react` (which 404'd), a local `.d.ts` file was added for simplicity and robustness.
- **Memory Limit**: `NODE_OPTIONS=--max_old_space_size=4096` is now required for building due to the massive size of the `googleapis` type definition files.

## Verification

Ran `npm run build` with increased memory limit.
- Verified TypeScript checks pass.
- Verified static pages generated successfully.

## Remaining Work and Risks

None.
