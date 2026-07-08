"use client";

import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import { Search, Loader2, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/app/dashboard/queries";
import { formatJakartaDate } from "@/lib/time";
import { BmsMobileActivityItem } from "@/components/bms-mobile/bms-activity-item";
import { getBMSActivityPaginatedAction } from "../actions";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBmsMobileHeaderVisibility } from "@/components/bms-mobile/use-bms-mobile-header-visibility";
import { ACTION_OPTIONS } from "@/app/dashboard/activity/activity-format";

export function getActivityDateLabel(date: Date) {
    const now = new Date();
    const d = new Date(date);
    
    // We do simple local date comparison for simplicity,
    // assuming client timezone is close enough to Jakarta or it's fine for mobile display.
    const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Hari ini";
    if (isYesterday) return "Kemarin";
    
    return formatJakartaDate(d);
}

type ActivityListProps = {
    initialItems?: ActivityItem[];
    initialCursor?: string | null;
    initialSearch?: string;
    initialAction?: string;
    className?: string;
};

export function BmsMobileActivityList({ 
    initialItems = [], 
    initialCursor = null,
    initialSearch = "",
    initialAction = "all",
}: ActivityListProps) {
    const [items, setItems] = useState<ActivityItem[]>(initialItems);
    const [search, setSearch] = useState(initialSearch);
    const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
    const [action, setAction] = useState(initialAction);
    const [cursor, setCursor] = useState<string | null>(initialCursor);
    const [hasMore, setHasMore] = useState(initialCursor !== null);
    const [isPending, startTransition] = useTransition();
    const [isLoadingInitial, setIsLoadingInitial] = useState(false);
    
    // Track if this is the first render to prevent double fetching
    const isFirstRender = useRef(true);
    const loaderRef = useRef<HTMLDivElement>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset and fetch first page on filter change
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            // Skip fetch on mount since we have SSR data
            if (debouncedSearch === initialSearch && action === initialAction) {
                return;
            }
        }

        let isMounted = true;
        
        async function fetchFirstPage() {
            setIsLoadingInitial(true);
            try {
                const res = await getBMSActivityPaginatedAction({
                    search: debouncedSearch,
                    action,
                    limit: 20,
                    cursor: null
                });
                if (isMounted) {
                    setItems(res.items);
                    setCursor(res.nextCursor);
                    setHasMore(res.nextCursor !== null);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (isMounted) setIsLoadingInitial(false);
            }
        }

        fetchFirstPage();

        return () => {
            isMounted = false;
        };
    }, [debouncedSearch, action]);

    // Intersection observer for infinite scroll
    const fetchMore = useCallback(async () => {
        if (isPending || !hasMore || !cursor || isLoadingInitial) return;
        
        startTransition(async () => {
            try {
                const res = await getBMSActivityPaginatedAction({
                    search: debouncedSearch,
                    action,
                    limit: 20,
                    cursor,
                });
                setItems((prev) => [...prev, ...res.items]);
                setCursor(res.nextCursor);
                setHasMore(res.nextCursor !== null);
            } catch (err) {
                console.error(err);
            }
        });
    }, [cursor, debouncedSearch, action, hasMore, isPending, isLoadingInitial]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    fetchMore();
                }
            },
            { threshold: 0.1, rootMargin: "200px" }
        );

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [fetchMore]);

    // Group items
    const groupedItems = items.reduce<
        Record<string, { label: string; items: ActivityItem[]; dateMs: number }>
    >((groups, item) => {
        const label = getActivityDateLabel(item.createdAt);
        if (!groups[label]) {
            groups[label] = {
                label,
                items: [],
                // We use midnight of the item's date for sorting groups
                dateMs: new Date(item.createdAt).setHours(0,0,0,0),
            };
        }
        groups[label].items.push(item);
        return groups;
    }, {});

    const groups = Object.values(groupedItems).sort(
        (a, b) => b.dateMs - a.dateMs,
    );

    const isHeaderVisible = useBmsMobileHeaderVisibility();

    return (
        <section className="flex flex-col gap-4">
            <div 
                className={cn(
                    "sticky z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur shadow-sm flex flex-col gap-2 transition-[top] duration-300 ease-out",
                    isHeaderVisible ? "top-14" : "top-0"
                )}
            >
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Cari aktivitas..."
                            className="w-full pl-9 bg-card text-sm h-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0 h-9 w-9 bg-card">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Filter Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={action} onValueChange={setAction}>
                                <DropdownMenuRadioItem value="all">Semua Status</DropdownMenuRadioItem>
                                {ACTION_OPTIONS.map((opt) => (
                                    <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {isLoadingInitial ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : items.length === 0 ? (
                <Card className="border-dashed border-border/70 bg-card/60">
                    <CardContent className="text-center text-sm text-muted-foreground pt-6">
                        Tidak ada aktivitas yang sesuai dengan filter.
                    </CardContent>
                </Card>
            ) : (
                <div className="flex flex-col gap-4">
                    {groups.map((group) => (
                        <div key={group.label} className="flex flex-col gap-2">
                            <h2 className="px-1 font-heading text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                                {group.label}
                            </h2>

                            <div className="flex flex-col">
                                {group.items.map((item) => (
                                    <BmsMobileActivityItem 
                                        key={item.id} 
                                        item={item} 
                                        showRelativeTime={false} 
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Intersection observer target for loading more */}
            <div ref={loaderRef} className="h-8 w-full flex items-center justify-center">
                {isPending && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
            </div>
        </section>
    );
}
