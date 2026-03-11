import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DashboardMenuItem {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    variant: "default" | "outline";
}

export interface DashboardMenusProps {
    menus: DashboardMenuItem[];
}

export function DashboardMenus({ menus }: DashboardMenusProps) {
    if (menus.length === 0) return null;
    
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 shrink-0">
            {menus.map((menu, index) => {
                const Icon = menu.icon;
                const isDefault = menu.variant === "default";
                return (
                    <Button
                        key={index}
                        asChild
                        variant={isDefault ? "default" : "outline"}
                        className="w-full justify-start gap-2 h-auto text-left py-2.5"
                    >
                        <Link href={menu.href}>
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="whitespace-normal leading-snug">{menu.title}</span>
                        </Link>
                    </Button>
                );
            })}
        </div>
    );
}
