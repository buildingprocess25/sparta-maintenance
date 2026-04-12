import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/change-password-dialog";

export interface DashboardMenuItem {
    title: string;
    description: string;
    icon: LucideIcon;
    href?: string;
    action?: "change-password";
    variant: "default" | "outline";
    newTab?: boolean;
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
                
                if (menu.action === "change-password") {
                    return (
                        <ChangePasswordDialog
                            key={index}
                            variant={isDefault ? "default" : "outline"}
                            menuTitle={menu.title}
                            iconNode={<Icon className="h-4 w-4 shrink-0" />}
                        />
                    );
                }

                return (
                    <Button
                        key={index}
                        asChild
                        variant={isDefault ? "default" : "outline"}
                        className="w-full justify-start gap-2 h-auto text-left py-2.5"
                    >
                            {menu.href && (
                                <Link prefetch={false}
                                    href={menu.href}
                                    target={menu.newTab ? "_blank" : undefined}
                                    rel={
                                        menu.newTab ? "noopener noreferrer" : undefined
                                    }
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="whitespace-normal leading-snug">
                                        {menu.title}
                                    </span>
                                </Link>
                            )}
                    </Button>
                );
            })}
        </div>
    );
}
