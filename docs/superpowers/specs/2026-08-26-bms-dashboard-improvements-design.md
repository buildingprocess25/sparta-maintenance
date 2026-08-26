# BMS Dashboard & Preventive Coverage Improvements Design

## Goal
To improve the user experience on the BMS Dashboard and Preventive Coverage pages by aligning label styling, adding an encouraging dynamic summary for the preventive targets, and introducing a search feature to easily locate stores.

## Scope
1. **Label Styling**: Make the "Belum Preventif" and "Sudah Preventif" badges on `app/dashboard/coverage/page.tsx` visually match the ones in `app/reports/(bms)/create/components/store-step.tsx`.
2. **Dashboard Card Narration**: Enhance `app/dashboard/_components/bms-preventive-card.tsx` to include "Rekap Preventif" title and a dynamic encouraging message based on completion percentage and remaining quarter days.
3. **Coverage Search**: Extract the interactive UI out of the server component `app/dashboard/coverage/page.tsx` into a new client component `coverage-client.tsx` to support real-time unified search across all stores.

## Architecture & Components

### 1. Label Styling (`app/dashboard/coverage/page.tsx`)
We will update the Tailwind classes for the badges:
- **Belum Preventif**: `bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-none shrink-0`
- **Sudah Preventif**: `bg-primary/10 text-primary hover:bg-primary/20 border-none shrink-0`

### 2. Dashboard Card Narration (`app/dashboard/_components/bms-preventive-card.tsx`)
**Data Calculation:**
- Extract the quarter end date based on `quarterLabel` (e.g., "Q3 2026").
  - Q1 ends March 31
  - Q2 ends June 30
  - Q3 ends September 30
  - Q4 ends December 31
- Calculate remaining days from today until the quarter end date.
- Define `isUrgent` if remaining days <= 30.

**Logic Matrix:**
- **isUrgent = false (Safe, > 30 days remaining)**
  - 0%: "Belum ada preventif. Yuk mulai cicil dari sekarang biar nggak menumpuk!"
  - 1% - 49%: "Awal yang baik! Kamu udah preventif {completed} dari {total} toko. Yuk lanjutin!"
  - 50% - 99%: "Kerja bagus! Udah lebih dari setengah perjalanan. Pertahankan!"
  - 100%: "Luar biasa! Semua target preventif kuartal ini sudah selesai lebih awal. 🎉"
- **isUrgent = true (Urgent, <= 30 days remaining)**
  - 0% - 49%: "Waktu makin mepet nih! Ayo kejar ketertinggalan, masih ada {total - completed} toko lagi. Semangat!"
  - 50% - 99%: "Akhir kuartal sebentar lagi. Tinggal {total - completed} toko tersisa, sedikit lagi pasti bisa!"
  - 100%: "Mantap! Tepat pada waktunya, semua target selesai dengan sempurna. 🏆"

**Layout:**
- Add "Rekap Preventif" as a small, bold header above the Target label.
- Add the dynamic narration text right above the progress bar, formatted as a muted subtitle.

### 3. Coverage Search (`app/dashboard/coverage/components/coverage-client.tsx`)
**Refactoring:**
- Move the Tabs and store list mapping from `page.tsx` into a new `CoverageClient` component.
- The `page.tsx` will remain a Server Component, fetch `coverage`, and pass it as a prop to `<CoverageClient coverage={coverage} />`.

**State Management:**
- `searchQuery` (string): State to hold the current search input.

**Behavior:**
- **No Search Query (`searchQuery === ""`):** Render the standard Tabs layout ("Belum" and "Sudah").
- **With Search Query (`searchQuery !== ""`):** 
  - Hide the Tabs.
  - Combine `coverage.pending` and `coverage.completed` into a single array, filtering by `storeCode` or `storeName` matching the query (case-insensitive).
  - Render the filtered list directly. Each item uses its respective "Sudah/Belum" styling.
  - Provide a clear "X" button inside the search input to reset the state back to the Tabs view.

## Open Questions & Risks
- **Quarter Label Format**: We assume `quarterLabel` comes as "Q1 2026". We need to safely parse this format to build Date objects. Fallbacks will be added if parsing fails (defaulting to safe conditions).
