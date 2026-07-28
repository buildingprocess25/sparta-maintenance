"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Joyride,
    STATUS,
    EVENTS,
    ACTIONS,
    type EventData,
} from "react-joyride";

import { ReportTourTooltip } from "@/components/reports/report-tour-tooltip";
import { getTodayJakartaDateKey } from "@/lib/time";
import {
    getBmsInputTourSteps,
} from "./bms-report-tour-steps";

type BmsReportTourProps = {
    activeStep: "store" | "checklist" | "estimation" | "review";
    isEditMode: boolean;
    isRepairOnlyMode: boolean;
};

export function BmsReportTour({ activeStep, isEditMode, isRepairOnlyMode }: BmsReportTourProps) {
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const dontShowTodayRef = useRef(false);
    const dismissedThisSession = useRef(false);
    const storageKey = isEditMode
        ? "bms-report-tour:v1:revision"
        : "bms-report-tour:v1:create";

    const allSteps = useMemo(
        () => getBmsInputTourSteps({ activeStep, isRepairOnlyMode }),
        [activeStep, isRepairOnlyMode],
    );

    const currentStep = allSteps[stepIndex];

    useEffect(() => {
        if (dismissedThisSession.current || !currentStep || run) {
            return;
        }

        if (window.localStorage.getItem(storageKey) === getTodayKey()) {
            return;
        }

        const interval = window.setInterval(() => {
            const target = currentStep.target;
            if (typeof target === "string" && document.querySelector(target)) {
                setRun(true);
                window.clearInterval(interval);
            }
        }, 100);

        return () => window.clearInterval(interval);
    }, [currentStep, storageKey, run]);

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
        if (
            data.type === EVENTS.STEP_AFTER &&
            (data.action === ACTIONS.NEXT || data.action === ACTIONS.PREV)
        ) {
            const nextIndex =
                stepIndex + (data.action === ACTIONS.NEXT ? 1 : -1);

            if (nextIndex < 0 || nextIndex >= allSteps.length) {
                setRun(false);
                return;
            }

            setRun(false);
            setStepIndex(nextIndex);
            return;
        }
        if (data.status === STATUS.SKIPPED || data.status === STATUS.FINISHED) {
            dismissedThisSession.current = true;
            if (dontShowTodayRef.current || getVisibleCheckboxChecked()) {
                window.localStorage.setItem(storageKey, getTodayKey());
            }
            setRun(false);
        }
    }

    if (!currentStep) return null;

    return (
        <Joyride
            run={run}
            continuous
            scrollToFirstStep={false}
            stepIndex={stepIndex}
            steps={allSteps}
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
