"use client";

import { useState } from "react";
import { formatRelativeDate } from "@/components/bms-mobile/bms-activity-item";
import { BmsBalanceHistoryItem, BmsBalanceInfo } from "@/lib/balance";
import { fetchBalanceHistoryAction } from "../actions";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Loader2, Receipt, AlertCircle, CheckCircle2, History, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type BalanceHistoryDrawerProps = {
  balanceInfo: BmsBalanceInfo;
};

export function BalanceHistoryDrawer({ balanceInfo }: BalanceHistoryDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<BmsBalanceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  async function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open && !hasFetched) {
      setIsLoading(true);
      try {
        const data = await fetchBalanceHistoryAction();
        setHistory(data);
        setHasFetched(true);
      } catch (e) {
        console.error("Failed to fetch balance history", e);
      } finally {
        setIsLoading(false);
      }
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <button className="mt-1 self-start flex items-center gap-1 text-[11px] font-medium text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full pl-3 pr-2 py-1 backdrop-blur-sm">
          Lihat Detail Riwayat
          <ChevronRight className="size-3" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border/40 text-left pb-4">
          <DrawerTitle className="text-xl">Detail Riwayat Saldo</DrawerTitle>
          <DrawerDescription>Rincian laporan yang menggunakan saldo operasional minggu ini.</DrawerDescription>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3 border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 mb-1">
                <CheckCircle2 className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Realisasi</span>
              </div>
              <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{formatCurrency(balanceInfo.totalRealized)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-100 dark:border-amber-900/30">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 mb-1">
                <AlertCircle className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Estimasi</span>
              </div>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-100">{formatCurrency(balanceInfo.totalEstimated)}</p>
            </div>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto p-4 sm:p-6 pb-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-8 animate-spin mb-4 opacity-50" />
              <p className="text-sm">Memuat riwayat...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <History className="size-6 opacity-50" />
              </div>
              <p className="text-sm font-medium">Belum ada riwayat saldo</p>
              <p className="text-xs opacity-70 text-center mt-1">Laporan yang memotong saldo akan muncul di sini.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {history.map((item) => (
                <div key={item.reportNumber} className="flex items-start justify-between py-3 border-b border-border/40 hover:bg-muted/30 transition-colors last:border-0 group">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "size-9 shrink-0 rounded-xl flex items-center justify-center mt-0.5",
                        item.type === "REALIZED" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
                      )}
                    >
                      <Receipt className="size-4" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{item.reportNumber}</p>
                        <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider", item.type === "REALIZED" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white")}>
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.storeCode} - {item.storeName}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">{formatRelativeDate(item.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right pl-2 shrink-0">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(item.consumedAmount)}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{item.type === "REALIZED" ? "Realisasi" : "Estimasi"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
