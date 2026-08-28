import Image from "next/image";
import { AlertTriangle, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BmsBalanceInfo } from "@/lib/balance";
import { BalanceHistoryDrawer } from "./balance-history-drawer";

type BmsWelcomeCardProps = {
  name: string;
  balance: BmsBalanceInfo;
  className?: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BmsWelcomeCard({ name, balance, className }: BmsWelcomeCardProps) {
  const usedAmount = balance.totalRealized + balance.totalEstimated;
  const usagePercent = balance.initialBalance > 0 ? Math.min(100, Math.round((usedAmount / balance.initialBalance) * 100)) : 0;

  const isWarning = usagePercent >= 75 && usagePercent < 100;
  const isDanger = usagePercent >= 100;
  const isLocked = balance.isLocked;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-lg", isLocked && "bg-red-600", className)}>
      {/* Subtle radial background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.10)_0%,_transparent_65%)]" />

      {/* Left content — capped at 60% width so character never overlaps */}
      <div className="relative z-10 flex w-[60%] flex-col gap-2.5 p-4 sm:p-5">
        {/* ── Greeting ── */}
        <div>
          <p className="text-[11px] font-medium text-primary-foreground/70">Selamat datang,</p>
          <h3 className="truncate font-heading text-lg font-bold leading-tight tracking-tight sm:text-xl" title={name}>
            {name}
          </h3>
        </div>

        {/* ── Hero: Sisa Saldo ── */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-primary-foreground/60">Sisa Saldo Minggu Ini</p>
          <p className={cn("mt-0.5 font-mono text-2xl font-extrabold tracking-tight text-white sm:text-3xl", isDanger && "text-red-200", isWarning && "text-amber-200")}>{formatCurrency(balance.availableBalance)}</p>
        </div>

        {balance.hangingDeduction > 0 ? (
          <div className="flex items-start gap-1.5 rounded-md bg-amber-300/20 px-2 py-1.5 text-amber-50">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            <p className="text-[10px] leading-snug">
              Saldo dasar dikurangi {formatCurrency(balance.hangingDeduction)} dari {balance.hangingReports.length} laporan menggantung.
            </p>
          </div>
        ) : null}

        {/* ── Progress Bar ── */}
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/25">
            <div className={cn("h-full rounded-full transition-all duration-700", isDanger ? "bg-red-300" : isWarning ? "bg-amber-300" : "bg-emerald-300")} style={{ width: `${Math.min(usagePercent, 100)}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-primary-foreground/50">
            <span>Terpakai {formatCurrency(usedAmount)}</span>
            <span>{usagePercent}%</span>
          </div>
        </div>

        {/* ── Status Badge / Lock Warning ── */}
        {isLocked ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-black/25 px-2.5 py-1.5">
            <Lock className="size-3 shrink-0 text-red-200" />
            <p className="text-[10px] leading-snug text-red-100">Saldo terkunci — PJUM menunggu persetujuan BNM Manager</p>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] text-center font-bold uppercase tracking-wider",
                isDanger ? "bg-red-400/30 text-red-100" : isWarning ? "bg-amber-400/25 text-amber-100" : "bg-emerald-400/20 text-emerald-100",
              )}
            >
              {isDanger ? "Saldo Habis" : isWarning ? "Hampir Habis" : "Aktif"}
            </span>
            <span className="text-[10px] text-primary-foreground/50">dari {formatCurrency(balance.initialBalance)}</span>
          </div>
        )}

        <BalanceHistoryDrawer balanceInfo={balance} />
      </div>

      {/* ── 3D Character ── */}
      <div className="pointer-events-none absolute -bottom-24 -right-14 top-0 h-[155%] w-[75%] max-w-[250px]">
        <Image src="/assets/dashboard.png" alt="Dashboard Character" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-contain object-top drop-shadow-xl" priority />
      </div>
    </div>
  );
}
