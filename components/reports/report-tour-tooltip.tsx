"use client";

import { useState } from "react";
import type { TooltipRenderProps } from "react-joyride";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export type ReportTourTooltipProps = TooltipRenderProps & {
    defaultDontShowToday: boolean;
    onDontShowTodayChange: (checked: boolean) => void;
    checkboxDataAttribute: string;
};

export function ReportTourTooltip({
    backProps,
    index,
    isLastStep,
    primaryProps,
    size,
    skipProps,
    step,
    tooltipProps,
    defaultDontShowToday,
    onDontShowTodayChange,
    checkboxDataAttribute,
}: ReportTourTooltipProps) {
    const [checked, setChecked] = useState(defaultDontShowToday);

    function toggleDontShowToday(event: {
        preventDefault: () => void;
        stopPropagation: () => void;
    }) {
        event.preventDefault();
        event.stopPropagation();
        setChecked((current) => {
            const next = !current;
            onDontShowTodayChange(next);
            return next;
        });
    }

    const checkboxDataProps = {
        [checkboxDataAttribute]: checked ? "true" : "false",
    };

    return (
        <div
            {...tooltipProps}
            className="w-[min(360px,calc(100vw-2rem))] rounded-lg border bg-background p-3 text-sm text-foreground shadow-2xl"
        >
            <div className="flex flex-col gap-2">
                {step.title ? (
                    <div className="font-semibold">{step.title}</div>
                ) : null}
                <div className="text-xs leading-relaxed text-muted-foreground">
                    {step.content}
                </div>
                <div
                    role="checkbox"
                    tabIndex={0}
                    aria-checked={checked}
                    {...checkboxDataProps}
                    className="flex w-fit cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground"
                    onClick={toggleDontShowToday}
                    onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") {
                            return;
                        }

                        toggleDontShowToday(event);
                    }}
                >
                    <span
                        className={
                            checked
                                ? "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-primary bg-primary text-primary-foreground"
                                : "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background"
                        }
                    >
                        {checked ? <Check className="size-3" /> : null}
                    </span>
                    <span>Jangan tampilkan lagi hari ini</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                        {...skipProps}
                        type="button"
                        variant="ghost"
                        size="sm"
                    >
                        Lewati
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="min-w-10 text-center text-xs text-muted-foreground">
                            {index + 1}/{size}
                        </span>
                        <Button
                            {...backProps}
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={index === 0}
                            aria-label="Sebelumnya"
                        >
                            <ChevronLeft />
                        </Button>
                        <Button
                            {...primaryProps}
                            type="button"
                            size="icon-sm"
                            aria-label={isLastStep ? "Selesai" : "Lanjut"}
                        >
                            <ChevronRight />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
