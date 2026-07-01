"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Joyride,
    STATUS,
    type EventData,
    type Step,
    type TooltipRenderProps,
} from "react-joyride";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getTodayJakartaDateKey } from "@/lib/time";

type ApprovalReviewTourProps = {
    enabled: boolean;
    status: string;
    viewerRole: string;
};

export function ApprovalReviewTour({
    enabled,
    status,
    viewerRole,
}: ApprovalReviewTourProps) {
    const [run, setRun] = useState(false);
    const hasAutoRun = useRef(false);
    const dontShowTodayRef = useRef(false);
    const storageKey = `approval-review-tour:v4:${viewerRole}:${status}`;
    const steps = useMemo<Step[]>(
        () => [
            {
                skipBeacon: true,
                target: "[data-tour='approval-review-bar']",
                title: "Alur review approval",
                content:
                    "Gunakan area ini sebagai ringkasan sebelum mengambil keputusan. Jika masih ada syarat review, tombol setujui akan terkunci.",
                placement: "top",
                isFixed: true,
            },
            {
                skipBeacon: true,
                target: "[data-tour='approval-compare-nota']",
                title: "Bandingkan nota",
                content:
                    "Buka fitur ini untuk melihat foto nota berdampingan dengan tabel realisasi BMS.",
                placement: "bottom",
                skipScroll: true,
            },
            {
                skipBeacon: true,
                target: "[data-tour='approval-work-photos']",
                title: "Cek foto pekerjaan",
                content:
                    "Buka foto-foto pada setiap item pekerjaan untuk memastikan kondisi awal, hasil pekerjaan, dan nota item sudah sesuai.",
                placement: "top",
            },
            {
                skipBeacon: true,
                target: "[data-tour='approval-decision-actions']",
                title: "Ambil keputusan",
                content:
                    "Setelah review selesai, pilih setujui untuk melanjutkan proses atau minta revisi jika ada data yang perlu diperbaiki.",
                placement: "top",
                isFixed: true,
            },
        ],
        [],
    );

    useEffect(() => {
        if (!enabled) {
            hasAutoRun.current = false;
            return;
        }

        if (hasAutoRun.current) {
            return;
        }

        let attempts = 0;

        const interval = window.setInterval(() => {
            attempts += 1;

            if (window.localStorage.getItem(storageKey) === getTodayKey()) {
                hasAutoRun.current = true;
                window.clearInterval(interval);
                return;
            }

            if (document.querySelector("[data-tour='approval-review-bar']")) {
                hasAutoRun.current = true;
                setRun(true);
                window.clearInterval(interval);
                return;
            }

            if (attempts >= 50) {
                window.clearInterval(interval);
            }
        }, 100);

        return () => window.clearInterval(interval);
    }, [enabled, storageKey]);

    useEffect(() => {
        if (!run) {
            document.body.style.removeProperty("overflow");
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [run]);

    function handleEvent(data: EventData) {
        if (data.status !== STATUS.FINISHED && data.status !== STATUS.SKIPPED) {
            return;
        }

        if (dontShowTodayRef.current || getVisibleCheckboxChecked()) {
            window.localStorage.setItem(storageKey, getTodayKey());
        }
        setRun(false);
    }

    if (!enabled) return null;

    return (
        <Joyride
            continuous
            run={run}
            scrollToFirstStep={false}
            steps={steps}
            options={{
                blockTargetInteraction: true,
                buttons: ["skip", "back", "primary"],
                closeButtonAction: "skip",
                overlayClickAction: false,
                overlayColor: "rgb(15 23 42 / 0.45)",
                primaryColor: "hsl(var(--primary))",
                spotlightPadding: 8,
                zIndex: 80,
            }}
            tooltipComponent={(props) => (
                <ApprovalTourTooltip
                    {...props}
                    defaultDontShowToday={dontShowTodayRef.current}
                    onDontShowTodayChange={(checked) => {
                        dontShowTodayRef.current = checked;
                    }}
                />
            )}
            onEvent={handleEvent}
        />
    );
}

function ApprovalTourTooltip({
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
}: TooltipRenderProps & {
    defaultDontShowToday: boolean;
    onDontShowTodayChange: (checked: boolean) => void;
}) {
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
                    data-approval-tour-hide-today={checked ? "true" : "false"}
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

function getTodayKey() {
    return getTodayJakartaDateKey();
}

function getVisibleCheckboxChecked() {
    return (
        document.querySelector("[data-approval-tour-hide-today='true']") !==
        null
    );
}

