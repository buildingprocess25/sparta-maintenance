import type { ReactNode } from "react";

import {
    BmsMobileBottomNav,
    type BmsMobileNavItem,
} from "./bms-mobile-bottom-nav";
import { BmsMobileHeader } from "./bms-mobile-header";

type BmsMobilePageProps = {
    children: ReactNode;
    navItem: BmsMobileNavItem;
    title?: string;
    showBackButton?: boolean;
    backHref?: string;
    userInitials?: string;
};

export function BmsMobilePage({
    children,
    navItem,
    title,
    showBackButton,
    backHref,
    userInitials,
}: BmsMobilePageProps) {
    return (
        <div className="relative isolate min-h-svh bg-background text-foreground">
            <BmsMobileHeader
                title={title}
                showBackButton={showBackButton}
                backHref={backHref}
                userInitials={userInitials}
            />
            <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-32 pt-16">
                {children}
            </main>
            <BmsMobileBottomNav activeItem={navItem} />
        </div>
    );
}
