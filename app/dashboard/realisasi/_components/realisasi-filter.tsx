"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
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

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Parse helpers ────────────────────────────────────────────────────────────

/**
 * Returns the period select value:
 *  - "ytd" for YTD
 *  - "01"–"12" (month number) for a specific month
 */
function parsePeriodValue(raw: string): { selectVal: string; year: string } {
  const match = /^(\d{2})-(\d{4})$/.exec(raw);
  if (match) return { selectVal: match[1], year: match[2] };
  return {
    selectVal: "ytd",
    year: String(new Date().getFullYear()),
  };
}

function getMonthLabel(val: string): string {
  return MONTH_OPTIONS.find((o) => o.value === val)?.label ?? val;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RealisasiFilter({
  branches,
  initialPeriod,
  initialBranch,
}: {
  branches: string[];
  initialPeriod: string;
  initialBranch: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const parsed = parsePeriodValue(initialPeriod);
  const [periodVal, setPeriodVal] = useState(parsed.selectVal); // "ytd" | "01"–"12"
  const [year, setYear] = useState(parsed.year);
  const [branch, setBranch] = useState(initialBranch || "all");

  const isMonthMode = periodVal !== "ytd";

  const navigate = useCallback(
    (nextPeriodVal: string, nextYear: string, nextBranch: string) => {
      const params = new URLSearchParams();
      if (nextPeriodVal !== "ytd") {
        params.set("period", `${nextPeriodVal}-${nextYear}`);
      } else {
        params.set("period", "ytd");
      }
      if (nextBranch && nextBranch !== "all") {
        params.set("branch", nextBranch);
      }
      startTransition(() => {
        router.push(`/dashboard/realisasi?${params.toString()}`);
      });
    },
    [router],
  );

  function handlePeriodChange(value: string) {
    setPeriodVal(value);
    navigate(value, year, branch);
  }

  function handleYearBlur(e: React.FocusEvent<HTMLInputElement>) {
    const y = e.target.value.trim();
    if (/^\d{4}$/.test(y)) {
      setYear(y);
      navigate(periodVal, y, branch);
    }
  }

  function handleYearKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  }

  function handleBranchChange(value: string) {
    setBranch(value);
    navigate(periodVal, year, value);
  }

  return (
    <div className="flex items-center gap-2">
      {/* Periode — merged single dropdown */}
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

      {/* Tahun — tampil jika bulan dipilih */}
      {isMonthMode && (
        <Input
          type="text"
          inputMode="numeric"
          defaultValue={year}
          onBlur={handleYearBlur}
          onKeyDown={handleYearKeyDown}
          placeholder={String(new Date().getFullYear())}
          maxLength={4}
          className="h-8 w-16 text-xs"
        />
      )}

      {/* Cabang */}
      <Select value={branch} onValueChange={handleBranchChange}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <Building2 className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Semua Cabang" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="all" className="text-xs">
            Semua Cabang
          </SelectItem>
          {branches.map((b) => (
            <SelectItem key={b} value={b} className="text-xs">
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
