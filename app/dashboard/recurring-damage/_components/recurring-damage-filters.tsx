"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    RECURRING_DAMAGE_MONTH_LABELS,
    RECURRING_DAMAGE_QUARTER_MONTHS,
    type RecurringDamagePeriod,
    type RecurringDamageViewMode,
} from "@/lib/recurring-damage";
import { STORE_BRAND_OPTIONS, type StoreBrandFilter } from "@/lib/store-brand-filter";

const ALL = "all";

const quarterOptions = [
    { value: 1, label: "Triwulan 1" },
    { value: 2, label: "Triwulan 2" },
    { value: 3, label: "Triwulan 3" },
    { value: 4, label: "Triwulan 4" },
] as const;

export type RecurringDamageFilterChange = {
    year?: number;
    quarter?: number;
    month?: number;
    branch?: string;
    item?: string;
    view?: RecurringDamageViewMode;
    brand?: StoreBrandFilter;
};

export function RecurringDamageFilters({
    isAdmin,
    branchOptions,
    availableYears,
    period,
    branchName,
    brand,
    onChange,
}: {
    isAdmin: boolean;
    branchOptions: string[];
    availableYears: number[];
    period: RecurringDamagePeriod;
    branchName: string;
    brand: StoreBrandFilter;
    onChange: (change: RecurringDamageFilterChange) => void;
}) {
    const monthOptions = period.quarter
        ? RECURRING_DAMAGE_QUARTER_MONTHS[period.quarter]
        : [];
    const yearOptions = availableYears.includes(period.year)
        ? availableYears
        : [period.year, ...availableYears];

    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
            {isAdmin ? (
                <Select
                    value={brand}
                    onValueChange={(value) =>
                        onChange({ brand: value as StoreBrandFilter })
                    }
                >
                    <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[140px]">
                        <SelectValue placeholder="Semua Brand" />
                    </SelectTrigger>
                    <SelectContent>
                        {STORE_BRAND_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : null}
            {isAdmin ? (
                <Select
                    value={branchName}
                    onValueChange={(value) => onChange({ branch: value })}
                >
                    <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[190px]">
                        <SelectValue placeholder="Semua Cabang" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>Semua Cabang</SelectItem>
                        {branchOptions.map((branch) => (
                            <SelectItem key={branch} value={branch}>
                                {branch}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : null}
            <Select
                value={period.quarter?.toString() ?? ALL}
                onValueChange={(value) =>
                    onChange({
                        quarter: value === ALL ? undefined : Number(value),
                        month: undefined,
                    })
                }
            >
                <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[150px]">
                    <SelectValue placeholder="Triwulan" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>Semua Triwulan</SelectItem>
                    {quarterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select
                value={period.month?.toString() ?? ALL}
                disabled={!period.quarter}
                onValueChange={(value) =>
                    onChange({ month: value === ALL ? undefined : Number(value) })
                }
            >
                <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[140px]">
                    <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>Semua Bulan</SelectItem>
                    {monthOptions.map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                            {RECURRING_DAMAGE_MONTH_LABELS[month - 1]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select
                value={period.year.toString()}
                onValueChange={(value) => onChange({ year: Number(value) })}
            >
                <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[110px]">
                    <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                    {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                            {year}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
