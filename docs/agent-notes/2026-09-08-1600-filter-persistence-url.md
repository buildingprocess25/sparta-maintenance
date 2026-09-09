---
date: 2026-09-08 16:00
task: filter-persistence-url
author: Antigravity
---

# Filter Persistence via URL

## Context / Problem
Users often experienced frustration when navigating away from a data table (e.g., to a detail page) and returning, only to find their applied filters completely reset. This required them to re-apply complex filters from scratch, disrupting their workflow.

## Resolution / Decision
Implemented filter persistence by synchronizing client-side filter states with the URL's query parameters for the following core dashboard pages:
- **Reports** (`/dashboard/reports`)
- **PJUM** (`/dashboard/pjum`)
- **Preventive** (`/dashboard/preventive`)
- **Stores** (`/dashboard/stores`)

## Implementation Details
1. **Server-Side Reading (SSR)**
   - Updated `page.tsx` for each of the relevant modules to read filter values directly from `searchParams`.
   - Passed these values down to the respective data table components as `initial*` props.
   - Example properties passed: `initialSearch`, `initialBranchName`, `initialYear`, etc.

2. **Client-Side Writing (Debounced)**
   - Added `useRouter` and `useSearchParams` from `next/navigation` to the client-side table components (`admin-*-table.tsx`).
   - Implemented a `pushFilterToUrl` callback function using a `URLSearchParams` object to update the URL based on the current state variables.
   - Used a `setTimeout`-based debounce (300ms) on `router.replace` with `{ scroll: false }` to avoid cluttering browser history and preserve the user's scroll position while ensuring fast UI responsiveness during input changes.
   - Hooked `pushFilterToUrl` into the existing `onChange` handlers of the `Input`, `Select`, and `Filters` components.

## Technical Choices
- Next.js built-in `next/navigation` was used instead of third-party libraries (e.g., `nuqs`) to avoid adding new dependencies to the project, adhering strictly to the user's constraint.
- The `search` input text is debounced directly via the 300ms timeout in `pushFilterToUrl`, keeping the user typing experience smooth without unnecessary rapid URL updates.
- Fallbacks to default values (e.g., `"all"` or current year) were implemented when no matching query parameter is found, ensuring seamless backward compatibility and correct initial rendering on fresh loads.

## Future Considerations
- The same pattern can be extended to `Users` or `Branches` pages if required in the future, although they were excluded in this phase as per requirements.
- Currently, URL syncing only pushes state on explicit changes to ensure SSR rendering stability. If more complex states (like active column sorting) are needed, they can be appended to the `params` object in the future.
