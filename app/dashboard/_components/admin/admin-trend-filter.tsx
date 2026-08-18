"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getJakartaYear } from "@/lib/time";

const MONTH_OPTIONS = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

function parsePeriodValue(raw: string): { selectVal: string; year: string } {
  const match = /^(\d{2})-(\d{4})$/.exec(raw);
  if (match) return { selectVal: match[1], year: match[2] };
  return {
    selectVal: "ytd",
    year: String(getJakartaYear()),
  };
}

function getMonthLabel(val: string): string {
  return MONTH_OPTIONS.find((o) => o.value === val)?.label ?? val;
}

export function buildAdminTrendFilterHref({
  basePath,
  period,
  year,
  brand,
  showBrandFilter,
}: {
  basePath: string;
  period: string;
  year: string;
  brand: string;
  showBrandFilter: boolean;
}) {
  const params = new URLSearchParams();
  params.set("period", period === "ytd" ? "ytd" : `${period}-${year}`);
  if (showBrandFilter && brand !== "ALL") params.set("brand", brand);
  return `${basePath}?${params.toString()}`;
}

export function AdminTrendPeriodFilter({
  initialPeriod,
  initialBrand = "ALL",
  showBrandFilter = false,
  basePath = "/dashboard",
}: {
  initialPeriod: string;
  initialBrand?: string;
  showBrandFilter?: boolean;
  basePath?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const parsed = parsePeriodValue(initialPeriod);
  const [periodVal, setPeriodVal] = useState(parsed.selectVal);
  const [year, setYear] = useState(parsed.year);
  const [brandVal, setBrandVal] = useState(initialBrand);

  const isMonthMode = periodVal !== "ytd";

  const navigate = useCallback(
    (nextPeriodVal: string, nextYear: string, nextBrandVal: string) => {
      startTransition(() => {
        router.push(
          buildAdminTrendFilterHref({
            basePath,
            period: nextPeriodVal,
            year: nextYear,
            brand: nextBrandVal,
            showBrandFilter,
          }),
        );
      });
    },
    [basePath, router, showBrandFilter],
  );

  function handlePeriodChange(value: string) {
    setPeriodVal(value);
    navigate(value, year, brandVal);
  }

  function handleYearBlur(e: React.FocusEvent<HTMLInputElement>) {
    const y = e.target.value.trim();
    if (/^\d{4}$/.test(y)) {
      setYear(y);
      navigate(periodVal, y, brandVal);
    }
  }

  function handleYearKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  }

  function handleBrandChange(value: string) {
    setBrandVal(value);
    navigate(periodVal, year, value);
  }

  return (
    <div className="flex items-center gap-2">
      {showBrandFilter ? (
        <Select value={brandVal} onValueChange={handleBrandChange}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="Pilih Brand" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="ALL" className="text-xs">Semua Brand</SelectItem>
            <SelectItem value="ALFAMART" className="text-xs">Alfamart</SelectItem>
            <SelectItem value="LAWSON" className="text-xs">Lawson</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      <Select value={periodVal} onValueChange={handlePeriodChange}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue>
            {periodVal === "ytd" ? "YTD (Tahun Ini)" : getMonthLabel(periodVal)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="ytd" className="text-xs">
            YTD (Tahun Ini)
          </SelectItem>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel className="text-xs font-medium text-muted-foreground">
              Bulan
            </SelectLabel>
            {MONTH_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {isMonthMode && (
        <Input
          type="text"
          inputMode="numeric"
          defaultValue={year}
          onBlur={handleYearBlur}
          onKeyDown={handleYearKeyDown}
          placeholder={String(getJakartaYear())}
          maxLength={4}
          className="h-8 w-16 text-xs"
        />
      )}

      {isPending && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
