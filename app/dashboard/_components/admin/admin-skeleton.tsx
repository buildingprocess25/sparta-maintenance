import { Skeleton } from "@/components/ui/skeleton";

// ─── Sidebar Skeleton ─────────────────────────────────────────────────────────
// Mirrors: components/app-sidebar.tsx
// Structure: Header (logo) → navMain (1 item) → navGroups (Rekapan 4, Management 2)
//            → navSecondary (2 items, mt-auto) → Footer (user)

function SidebarSkeleton() {
    return (
        <div
            className="hidden md:flex flex-col shrink-0 h-svh border-r"
            style={{ width: "16rem", background: "var(--sidebar)" }}
        >
            {/* Header — logo area (mirrors the glass-card logo container) */}
            <div className="px-3 pt-4 pb-2">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-black/10">
                    <Skeleton className="h-7 w-20 opacity-40" />
                    <div className="h-4 w-px bg-white/20" />
                    <Skeleton className="h-7 w-6 opacity-40" />
                    <div className="space-y-0.5">
                        <Skeleton className="h-3 w-12 opacity-40" />
                        <Skeleton className="h-2 w-16 opacity-30" />
                    </div>
                </div>
            </div>

            {/* navMain — Dashboard */}
            <div className="px-3 py-1">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
                    <Skeleton className="h-4 w-4 shrink-0 opacity-40" />
                    <Skeleton className="h-3 w-20 opacity-40" />
                </div>
            </div>

            {/* navGroups — Rekapan (4 items) */}
            <div className="px-3 py-1 mt-1">
                <Skeleton className="h-2.5 w-14 mb-2 ml-2 opacity-30" />
                {["Laporan Maintenance", "List Material", "PJUM", "Checklist Preventif"].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md">
                        <Skeleton className="h-4 w-4 shrink-0 opacity-40" />
                        <Skeleton
                            className="h-3 opacity-40"
                            style={{ width: `${[120, 80, 36, 130][i]}px` }}
                        />
                    </div>
                ))}
            </div>

            {/* navGroups — Management Database (2 items) */}
            <div className="px-3 py-1 mt-2">
                <Skeleton className="h-2.5 w-32 mb-2 ml-2 opacity-30" />
                {[40, 32].map((w, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md">
                        <Skeleton className="h-4 w-4 shrink-0 opacity-40" />
                        <Skeleton className="h-3 opacity-40" style={{ width: `${w}px` }} />
                    </div>
                ))}
            </div>

            {/* navSecondary — mt-auto (2 items: Arsip, Pengaturan) */}
            <div className="px-3 py-1 mt-auto">
                {[140, 120].map((w, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md">
                        <Skeleton className="h-4 w-4 shrink-0 opacity-40" />
                        <Skeleton className="h-3 opacity-40" style={{ width: `${w}px` }} />
                    </div>
                ))}
            </div>

            {/* Footer — user button */}
            <div className="px-3 py-3 border-t border-white/10">
                <div className="flex items-center gap-2 px-2 py-1.5">
                    <Skeleton className="h-8 w-8 rounded-lg shrink-0 opacity-40" />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-28 opacity-40" />
                        <Skeleton className="h-2 w-36 opacity-30" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Site Header Skeleton ─────────────────────────────────────────────────────
// Mirrors: admin-site-header.tsx
// h-15, SidebarTrigger | Separator | title text | optional action button

function SiteHeaderSkeleton({ showAction = false }: { showAction?: boolean }) {
    return (
        <header className="flex h-15 shrink-0 items-center border-b">
            <div className="flex w-full items-center justify-between px-4 lg:px-6">
                <div className="flex items-center gap-2">
                    {/* SidebarTrigger */}
                    <Skeleton className="h-7 w-7 rounded-md" />
                    {/* Separator */}
                    <div className="h-4 w-px bg-border mx-0.5" />
                    {/* Title */}
                    <Skeleton className="h-4 w-36" />
                </div>
                {showAction && (
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-28 rounded-md" />
                    </div>
                )}
            </div>
        </header>
    );
}

// ─── Dashboard Skeleton ───────────────────────────────────────────────────────
// Mirrors: admin-new-dashboard.tsx
// → 4 stat cards (grid md:cols-2 lg:cols-4)
// → 2 chart cards stacked (grid cols-1)

export function AdminDashboardSkeleton() {
    return (
        <div className="group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar">
            <SidebarSkeleton />

            {/* SidebarInset — rounded inset panel */}
            <div className="flex flex-1 flex-col bg-background overflow-hidden md:rounded-l-xl md:shadow">
                <SiteHeaderSkeleton />

                <div className="flex flex-col gap-6 p-4 lg:p-6">
                    {/* 4 stat cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="rounded-xl border bg-card p-5 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between pb-0">
                                    <Skeleton className="h-3 w-28" />
                                    <Skeleton className="h-4 w-4 rounded" />
                                </div>
                                <Skeleton className="h-7 w-24" />
                                <Skeleton className="h-2.5 w-40" />
                            </div>
                        ))}
                    </div>

                    {/* 2 chart cards */}
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                            {/* CardHeader */}
                            <div className="p-6 pb-2 space-y-1.5">
                                <Skeleton className="h-4 w-52" />
                                <Skeleton className="h-3 w-44" />
                            </div>
                            {/* CardContent — chart area */}
                            <div className="px-6 pb-6">
                                <Skeleton className="h-64 w-full rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Table Page Skeleton ──────────────────────────────────────────────────────
// Mirrors: reports / materials / pjum / preventive page layout
// → SiteHeader (with Ekspor button)
// → filter bar: search + 2 selects
// → table: sticky header + 12 rows + footer count

export function AdminTablePageSkeleton() {
    return (
        <div className="group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar">
            <SidebarSkeleton />

            <div className="flex flex-1 flex-col bg-background overflow-hidden md:rounded-l-xl md:shadow">
                <SiteHeaderSkeleton showAction />

                <div className="flex flex-col gap-4 p-4 lg:p-6 flex-1">
                    {/* Filter bar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search input with icon */}
                        <div className="relative flex-1">
                            <Skeleton className="absolute left-2.5 top-2.5 h-4 w-4" />
                            <Skeleton className="h-9 w-full rounded-md" />
                        </div>
                        {/* Branch select */}
                        <Skeleton className="h-9 w-full sm:w-[200px] rounded-md" />
                        {/* Year / extra select */}
                        <Skeleton className="h-9 w-full sm:w-[120px] rounded-md" />
                    </div>

                    {/* Table card */}
                    <div className="rounded-md border bg-card flex-1 flex flex-col overflow-hidden">
                        {/* Sticky table header */}
                        <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/50 sticky top-0">
                            <Skeleton className="h-3 w-8 shrink-0" />
                            <Skeleton className="h-3 w-40 shrink-0" />
                            <Skeleton className="h-3 w-28 shrink-0" />
                            <Skeleton className="h-3 w-24 shrink-0" />
                            <Skeleton className="h-3 w-20 shrink-0" />
                            <Skeleton className="h-3 w-24 shrink-0 ml-auto" />
                        </div>

                        {/* Table rows */}
                        <div className="flex-1 overflow-auto">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4 px-4 py-[11px] border-b last:border-b-0"
                                >
                                    {/* No. */}
                                    <Skeleton className="h-2.5 w-5 shrink-0" />
                                    {/* Name + subtext */}
                                    <div className="w-40 shrink-0 space-y-1.5">
                                        <Skeleton className="h-3 w-full" />
                                        <Skeleton className="h-2 w-3/4" />
                                    </div>
                                    {/* Col 3 */}
                                    <Skeleton className="h-2.5 w-24 shrink-0" />
                                    {/* Col 4 */}
                                    <Skeleton className="h-2.5 w-20 shrink-0" />
                                    {/* Badge */}
                                    <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                                    {/* Last col */}
                                    <Skeleton className="h-2.5 w-20 shrink-0 ml-auto" />
                                </div>
                            ))}
                        </div>

                        {/* Footer count bar */}
                        <div className="border-t bg-muted/20 px-4 py-2 flex items-center justify-between">
                            <Skeleton className="h-2.5 w-44" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
