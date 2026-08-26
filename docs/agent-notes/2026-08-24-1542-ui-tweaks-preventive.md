# UI Tweaks for BMS Preventive Coverage

## Scope

- Redesigned `BmsPreventiveCard` to be much smaller and compact.
- Added a "Preventif" item to the `BmsMobileBottomNav` for BMS users to easily navigate to the coverage page.
- Set `navItem="coverage"` on the Coverage page.

## Decisions

- **Smaller Card**: Changed from a large stat card to a sleek, clickable progress banner that integrates nicely without taking up too much vertical space.
- **Bottom Nav**: Added the new menu next to "Dashboard", "Laporan", and "Aktivitas" using the `IconShieldCheck` icon.
- **Real Data**: Verified that the data fetching logic already dynamically queries the `Store` table filtered by `user.branchNames`. 
