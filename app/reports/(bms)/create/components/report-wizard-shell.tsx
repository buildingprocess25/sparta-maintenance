"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useBmsMobileHeaderVisibility } from "@/components/bms-mobile/use-bms-mobile-header-visibility";
import { cn } from "@/lib/utils";

export type ReportWizardStep = {
    key: string;
    label: string;
};

type ReportWizardShellProps = {
    title: string;
    backHref?: string;
    onBack?: () => void;
    steps: ReportWizardStep[];
    activeStep: string;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
};

function getActiveStepIndex(
    steps: ReportWizardStep[],
    activeStep: string,
): number {
    const activeIndex = steps.findIndex((step) => step.key === activeStep);

    return activeIndex === -1 ? 0 : activeIndex;
}

export function ReportWizardShell({
    title,
    backHref,
    onBack,
    steps,
    activeStep,
    children,
    footer,
    className,
}: ReportWizardShellProps) {
    const activeStepIndex = getActiveStepIndex(steps, activeStep);
    const isHeaderVisible = useBmsMobileHeaderVisibility();
    const progressValue = ((activeStepIndex + 1) / steps.length) * 100;

    return (
        <div
            className={cn(
                "relative min-h-svh bg-background text-foreground",
                className,
            )}
        >
            <header
                className={cn(
                    "fixed inset-x-0 top-0 z-50 bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-transform duration-300 ease-out will-change-transform",
                    isHeaderVisible ? "translate-y-0" : "-translate-y-full",
                )}
            >
                <div className="mx-auto grid w-full max-w-lg grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 py-3">
                    <div className="flex justify-start">
                        {onBack ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Kembali"
                                className="rounded-full"
                                onClick={onBack}
                            >
                                <ArrowLeft />
                            </Button>
                        ) : (
                            <Button
                                asChild
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Kembali"
                                className="rounded-full"
                            >
                                <Link prefetch={false} href={backHref ?? "/dashboard"}>
                                    <ArrowLeft />
                                </Link>
                            </Button>
                        )}
                    </div>

                    <div className="min-w-0 text-center">
                        <h1 className="truncate text-xs font-semibold text-muted-foreground">
                            {title}
                        </h1>
                        <p className="truncate font-heading text-sm font-bold tracking-tight text-foreground">
                            {activeStepIndex + 1} / {steps.length}{" "}
                            {steps[activeStepIndex]?.label}
                        </p>
                    </div>

                    <div />
                </div>

                <div
                    aria-hidden="true"
                    className="h-0.5 w-full bg-border/70"
                    role="presentation"
                >
                    <div
                        className="h-full bg-primary transition-[width] duration-300 ease-out"
                        style={{ width: `${progressValue}%` }}
                    />
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pt-20 pb-32">
                {children}
            </main>

            {footer && (
                <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-12px_40px_rgb(15_23_42/0.08)] backdrop-blur-xl">
                    <div className="mx-auto w-full max-w-lg">{footer}</div>
                </footer>
            )}
        </div>
    );
}
