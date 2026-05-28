"use client";

import * as React from "react";
import { Calendar, ChevronDown, FilterIcon, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FilterValue = string | number | boolean;

export type Filter<T = FilterValue> = {
    id: string;
    field: string;
    operator: string;
    values: T[];
};

export type FilterOption<T = FilterValue> = {
    value: T;
    label: string;
    icon?: React.ReactNode;
    className?: string;
};

export type FilterFieldType =
    | "text"
    | "date"
    | "select"
    | "multiselect"
    | "custom"
    | "separator";

export type FilterFieldConfig<T = FilterValue> = {
    key: string;
    label: string;
    type: FilterFieldType;
    icon?: React.ReactNode;
    options?: FilterOption<T>[];
    operators?: string[];
    defaultOperator?: string;
    placeholder?: string;
    searchable?: boolean;
    maxSelections?: number;
    prefix?: React.ReactNode | string;
    suffix?: React.ReactNode | string;
    pattern?: string;
    validation?: (value: T[]) => boolean | { valid: boolean; message?: string };
    customRenderer?: (props: {
        filter: Filter<T>;
        field: FilterFieldConfig<T>;
        updateValues: (values: T[]) => void;
    }) => React.ReactNode;
    customValueRenderer?: (
        values: T[],
        options?: FilterOption<T>[],
    ) => React.ReactNode;
    fields?: FilterFieldConfig<T>[];
    group?: string;
    className?: string;
};

export type FilterI18nConfig = {
    addFilter: string;
    searchFields: string;
    operators: Record<string, string>;
    validation: Record<string, string>;
    placeholders: Record<string, string>;
};

export type FilterGroup<T = FilterValue> = {
    id: string;
    label: string;
    fields: FilterFieldConfig<T>[];
    initialFilters?: Filter<T>[];
};

type FiltersProps<T = FilterValue> = {
    filters: Filter<T>[];
    fields: FilterFieldConfig<T>[];
    onChange: (filters: Filter<T>[]) => void;
    size?: "sm" | "default" | "lg";
    trigger?: React.ReactNode;
    showSearchInput?: boolean;
    allowMultiple?: boolean;
    enableShortcut?: boolean;
    shortcutKey?: string;
    shortcutLabel?: string;
    i18n?: Partial<FilterI18nConfig>;
    className?: string;
    menuPopupClassName?: string;
};

const sizeStyles = {
    sm: {
        container: "gap-1.5",
        control: "h-8 text-xs",
        icon: "h-3.5 w-3.5",
    },
    default: {
        container: "gap-2",
        control: "h-9 text-sm",
        icon: "h-4 w-4",
    },
    lg: {
        container: "gap-2.5",
        control: "h-10 text-sm",
        icon: "h-4 w-4",
    },
};

export function createFilter<T = FilterValue>(
    field: string,
    operator = "is",
    values: T[] = [],
): Filter<T> {
    return {
        id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${field}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        field,
        operator,
        values,
    };
}

export function createFilterGroup<T = FilterValue>(
    id: string,
    label: string,
    fields: FilterFieldConfig<T>[],
    initialFilters?: Filter<T>[],
): FilterGroup<T> {
    return { id, label, fields, initialFilters };
}

export function Filters<T = FilterValue>({
    filters,
    fields,
    onChange,
    size = "default",
    trigger,
    showSearchInput = true,
    allowMultiple = true,
    enableShortcut = false,
    shortcutLabel = "F",
    i18n,
    className,
    menuPopupClassName,
}: FiltersProps<T>) {
    const [fieldSearch, setFieldSearch] = React.useState("");
    const styles = sizeStyles[size];

    const availableFields = React.useMemo(() => {
        return fields.filter((field) => {
            if (field.type === "separator") return false;
            if (!allowMultiple && filters.some((filter) => filter.field === field.key)) {
                return false;
            }
            if (!fieldSearch.trim()) return true;
            return field.label.toLowerCase().includes(fieldSearch.toLowerCase());
        });
    }, [allowMultiple, fieldSearch, fields, filters]);

    const updateFilter = React.useCallback(
        (filterId: string, values: T[]) => {
            onChange(
                filters.map((filter) =>
                    filter.id === filterId ? { ...filter, values } : filter,
                ),
            );
        },
        [filters, onChange],
    );

    const removeFilter = React.useCallback(
        (filterId: string) => {
            onChange(filters.filter((filter) => filter.id !== filterId));
        },
        [filters, onChange],
    );

    const addFilter = React.useCallback(
        (field: FilterFieldConfig<T>) => {
            const defaultValue =
                field.type === "select" && field.options?.[0]
                    ? [field.options[0].value]
                    : [];
            onChange([
                ...filters,
                createFilter<T>(field.key, field.defaultOperator ?? "is", defaultValue),
            ]);
        },
        [filters, onChange],
    );

    return (
        <div className={cn("flex flex-wrap items-center", styles.container, className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {trigger ?? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn("bg-white", styles.control)}
                        >
                            <Plus className={styles.icon} />
                            {i18n?.addFilter ?? "Tambah Filter"}
                            {enableShortcut && (
                                <span className="ml-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    {shortcutLabel}
                                </span>
                            )}
                        </Button>
                    )}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className={cn("w-64", menuPopupClassName)}
                >
                    <DropdownMenuLabel className="flex items-center gap-2">
                        <FilterIcon className="h-3.5 w-3.5" />
                        Filter
                    </DropdownMenuLabel>
                    {showSearchInput && (
                        <div className="px-2 pb-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    value={fieldSearch}
                                    onChange={(event) => setFieldSearch(event.target.value)}
                                    placeholder={i18n?.searchFields ?? "Cari filter..."}
                                    className="h-8 pl-7 text-xs"
                                />
                            </div>
                        </div>
                    )}
                    <DropdownMenuSeparator />
                    {availableFields.length > 0 ? (
                        availableFields.map((field) => (
                            <DropdownMenuItem
                                key={field.key}
                                className="text-xs"
                                onClick={() => addFilter(field)}
                            >
                                {field.icon}
                                {field.label}
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <div className="px-2 py-3 text-xs text-muted-foreground">
                            Tidak ada filter
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {filters.map((filter) => {
                const field = fields.find((item) => item.key === filter.field);
                if (!field) return null;

                return (
                    <FilterControl
                        key={filter.id}
                        filter={filter}
                        field={field}
                        size={size}
                        updateValues={(values) => updateFilter(filter.id, values)}
                        remove={() => removeFilter(filter.id)}
                    />
                );
            })}
        </div>
    );
}

function FilterControl<T = FilterValue>({
    filter,
    field,
    size,
    updateValues,
    remove,
}: {
    filter: Filter<T>;
    field: FilterFieldConfig<T>;
    size: "sm" | "default" | "lg";
    updateValues: (values: T[]) => void;
    remove: () => void;
}) {
    const styles = sizeStyles[size];

    return (
        <div
            className={cn(
                "inline-flex min-h-8 items-center gap-1 rounded-md border bg-white px-2 shadow-xs",
                size === "lg" && "min-h-10",
                field.className,
            )}
        >
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {field.icon}
                {field.label}
            </span>
            <div className="min-w-0">
                {field.type === "text" && (
                    <Input
                        value={String(filter.values[0] ?? "")}
                        onChange={(event) => updateValues([event.target.value as T])}
                        placeholder={field.placeholder}
                        className={cn("w-52 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0", styles.control)}
                    />
                )}
                {field.type === "date" && (
                    <div className="relative">
                        <Calendar className="pointer-events-none absolute left-1 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            type="date"
                            value={String(filter.values[0] ?? "")}
                            onChange={(event) => updateValues([event.target.value as T])}
                            className={cn("w-36 border-0 bg-transparent pl-6 pr-1 shadow-none focus-visible:ring-0", styles.control)}
                        />
                    </div>
                )}
                {field.type === "select" && (
                    <Select
                        value={String(filter.values[0] ?? "")}
                        onValueChange={(value) => updateValues([value as T])}
                    >
                        <SelectTrigger
                            className={cn(
                                "w-44 border-0 bg-transparent px-1 shadow-none focus:ring-0",
                                styles.control,
                            )}
                        >
                            <SelectValue placeholder={field.placeholder ?? "Pilih"} />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((option) => (
                                <SelectItem
                                    key={String(option.value)}
                                    value={String(option.value)}
                                    className={cn("text-xs", option.className)}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {field.type === "multiselect" && (
                    <MultiSelectControl
                        field={field}
                        values={filter.values}
                        updateValues={updateValues}
                        sizeClass={styles.control}
                    />
                )}
                {field.type === "custom" &&
                    field.customRenderer?.({ filter, field, updateValues })}
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={remove}
                aria-label={`Hapus filter ${field.label}`}
            >
                <X className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}

function MultiSelectControl<T = FilterValue>({
    field,
    values,
    updateValues,
    sizeClass,
}: {
    field: FilterFieldConfig<T>;
    values: T[];
    updateValues: (values: T[]) => void;
    sizeClass: string;
}) {
    const valueSet = React.useMemo(
        () => new Set(values.map((value) => String(value))),
        [values],
    );
    const selectedLabels = field.options
        ?.filter((option) => valueSet.has(String(option.value)))
        .map((option) => option.label);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    className={cn("justify-start px-1 font-normal", sizeClass)}
                >
                    <span className="max-w-40 truncate">
                        {selectedLabels?.length
                            ? selectedLabels.join(", ")
                            : field.placeholder ?? "Pilih"}
                    </span>
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                {field.options?.map((option) => {
                    const isSelected = valueSet.has(String(option.value));
                    return (
                        <DropdownMenuItem
                            key={String(option.value)}
                            className="text-xs"
                            onSelect={(event) => {
                                event.preventDefault();
                                if (isSelected) {
                                    updateValues(
                                        values.filter(
                                            (value) => String(value) !== String(option.value),
                                        ),
                                    );
                                    return;
                                }
                                if (
                                    field.maxSelections &&
                                    values.length >= field.maxSelections
                                ) {
                                    return;
                                }
                                updateValues([...values, option.value]);
                            }}
                        >
                            <span
                                className={cn(
                                    "mr-1 h-3 w-3 rounded border",
                                    isSelected && "border-primary bg-primary",
                                )}
                            />
                            {option.label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
