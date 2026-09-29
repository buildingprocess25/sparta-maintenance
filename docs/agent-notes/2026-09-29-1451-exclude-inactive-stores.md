# Exclude Inactive Stores from Preventive Dashboard

## Scope
Updated the `getAdminPreventive` query in `app/dashboard/preventive/actions.ts` to filter stores with `isActive: true`.

## Context and Sources
Previously, inactive (permanently closed) stores were being included in the preventive dashboard store calculation. Because these stores are never checklisted, they perpetually appear in the "Belum Checklist" tab and artificially deflate the preventive KPI percentage. Adding `isActive: true` ensures only open stores are counted towards compliance.
