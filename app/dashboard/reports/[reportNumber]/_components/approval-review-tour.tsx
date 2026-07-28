"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Joyride,
    STATUS,
    type EventData,
    type Step,
} from "react-joyride";

import { ReportTourTooltip } from "@/components/reports/report-tour-tooltip";
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
                <ReportTourTooltip
                    {...props}
                    defaultDontShowToday={dontShowTodayRef.current}
                    onDontShowTodayChange={(checked) => {
                        dontShowTodayRef.current = checked;
                    }}
                    checkboxDataAttribute="data-approval-tour-hide-today"
                />
            )}
            onEvent={handleEvent}
        />
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

