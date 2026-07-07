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
    subtitle?: string;
    showBackButton?: boolean;
    backHref?: string;
    showNotificationDot?: boolean;
    profileName?: string;
    jobTitle?: string;
};

export function BmsMobilePage({
    children,
    navItem,
    title,
    subtitle,
    showBackButton,
    backHref,
    showNotificationDot,
    profileName,
    jobTitle,
}: BmsMobilePageProps) {
    return (
        <div className="relative isolate min-h-svh bg-background text-foreground">
            <BmsMobileHeader
                title={title}
                subtitle={subtitle}
                showBackButton={showBackButton}
                backHref={backHref}
                showNotificationDot={showNotificationDot}
                profileName={profileName}
                jobTitle={jobTitle}
            />
            <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-32 pt-20">
                {children}
            </main>
            <BmsMobileBottomNav activeItem={navItem} />
        </div>
    );
}
