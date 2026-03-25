import Link from "next/link";
import { type LucideIcon, TrendingUp } from "lucide-react";

export interface DashboardStatItem {
    id: string;
    label: string;
    description?: string;
    value: number | string;
    icon: LucideIcon;
    href: string;
    colorClass: string; // e.g., "text-yellow-600"
}

export interface DashboardHeroStat extends DashboardStatItem {
    heroColorClass: string; // e.g., "bg-orange-500 text-white hover:bg-orange-600 focus:bg-orange-600"
    heroTextColorClass: string; // e.g., "text-orange-100"
    heroTrendColorClass: string; // e.g., "text-orange-200"
}

export interface DashboardStatsProps {
    hero: DashboardHeroStat;
    secondary: DashboardStatItem[];
    heroWidthClass?: string;
}

export function DashboardStats({ hero, secondary, heroWidthClass }: DashboardStatsProps) {
    const HeroIcon = hero.icon;
    
    // Determine grid columns dynamically based on length (Tailwind safelist might be needed, or inline style, but since it's only 1, 2, or 3, we can use a map)
    const gridColsClass = {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
    }[secondary.length] || "grid-cols-3";

    return (
        <div className="rounded-xl overflow-hidden border shadow-sm flex flex-col lg:flex-row">
            {/* Hero stat */}
            <Link
                href={hero.href}
                className={`group shrink-0 ${heroWidthClass || 'lg:w-52'} flex flex-row items-center justify-between gap-4 lg:flex-col lg:items-stretch lg:justify-between p-4 lg:p-5 transition-colors ${hero.heroColorClass}`}
            >
                <div>
                    <div className={`flex items-center gap-1.5 text-xs lg:text-base font-medium ${hero.heroTextColorClass}`}>
                        <HeroIcon className="h-3.5 w-3.5 shrink-0" />
                        {hero.label}
                    </div>
                    {hero.description && (
                        <p className={`text-sm mt-2 leading-snug hidden lg:block ${hero.heroTextColorClass}`}>
                            {hero.description}
                        </p>
                    )}
                </div>
                <div className="flex items-end gap-2 shrink-0 lg:items-center">
                    <div className="text-4xl lg:text-5xl font-bold tabular-nums leading-none">
                        {hero.value}
                    </div>
                    <TrendingUp className={`h-4 w-4 opacity-60 mb-0.5 hidden lg:block ${hero.heroTrendColorClass}`} />
                </div>
            </Link>

            {/* Secondary stats */}
            <div className={`flex-1 grid ${gridColsClass} divide-x divide-y lg:divide-y-0 bg-card`}>
                {secondary.map((stat) => {
                    const StatIcon = stat.icon;
                    return (
                        <Link
                            key={stat.id}
                            href={stat.href}
                            className="group p-3 lg:p-4 flex flex-col justify-between hover:bg-muted/40 transition-colors"
                        >
                            <StatIcon className={`h-3.5 w-3.5 ${stat.colorClass}`} />
                            <div>
                                <div className="text-2xl lg:text-3xl font-bold tabular-nums mt-2 lg:mt-3">
                                    {stat.value}
                                </div>
                                <p className="text-xs font-semibold lg:text-base mt-0.5">
                                    {stat.label}
                                </p>
                                {stat.description && (
                                    <p className="text-sm text-muted-foreground mt-0.5 hidden lg:block">
                                        {stat.description}
                                    </p>
                                )}
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
