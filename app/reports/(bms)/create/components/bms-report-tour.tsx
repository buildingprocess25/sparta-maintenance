"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Joyride,
    STATUS,
    type EventData,
} from "react-joyride";

import { ReportTourTooltip } from "@/components/reports/report-tour-tooltip";
import { getTodayJakartaDateKey } from "@/lib/time";
import {
    type BmsWizardStep,
    getBmsReportTourSteps,
} from "./bms-report-tour-steps";

type BmsReportTourProps = {
    activeStep: BmsWizardStep;
    isEditMode: boolean;
};

export function BmsReportTour({ activeStep, isEditMode }: BmsReportTourProps) {
    const [run, setRun] = useState(false);
    const hasAutoRun = useRef(false);
    const dontShowTodayRef = useRef(false);
    const dismissedThisSession = useRef(false);
    const storageKey = isEditMode
        ? "bms-report-tour:v1:revision"
        : "bms-report-tour:v1:create";

    const steps = useMemo(
        () => getBmsReportTourSteps(isEditMode),
        [isEditMode],
    );

    const activeTourSteps = useMemo(() => {
        const step = steps.find((s) => s.wizardStep === activeStep);
        return step ? [step] : [];
    }, [steps, activeStep]);

    useEffect(() => {
        hasAutoRun.current = false;

        if (dismissedThisSession.current || activeTourSteps.length === 0) {
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

            const target = activeTourSteps[0].target;
            if (typeof target === "string" && document.querySelector(target)) {
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
    }, [activeStep, activeTourSteps, storageKey]);

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
        if (data.status === STATUS.SKIPPED) {
            dismissedThisSession.current = true;
        }

        if (data.status !== STATUS.FINISHED && data.status !== STATUS.SKIPPED) {
            return;
        }

        if (dontShowTodayRef.current || getVisibleCheckboxChecked()) {
            window.localStorage.setItem(storageKey, getTodayKey());
        }
        setRun(false);
    }

    if (activeTourSteps.length === 0) return null;

    return (
        <Joyride
            run={run}
            scrollToFirstStep={false}
            steps={activeTourSteps}
            options={{
                blockTargetInteraction: false,
                buttons: ["skip", "primary"],
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
                    checkboxDataAttribute="data-bms-report-tour-hide-today"
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
        document.querySelector("[data-bms-report-tour-hide-today='true']") !==
        null
    );
}
