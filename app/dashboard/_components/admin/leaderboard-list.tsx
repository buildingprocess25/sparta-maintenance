import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type LeaderboardItem = {
  label: string;
  value: number;
  valueLabel: string;
  maxValue: number;
  colorClass: string;
};

export function LeaderboardList({
  title,
  items,
}: {
  title: string;
  items: LeaderboardItem[];
}) {
  return (
    <Card className="flex-1 h-full flex flex-col shadow-sm border-muted/60">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-1">
        <div className="space-y-5">
          {items.map((item, i) => {
            const percentage =
              item.maxValue > 0
                ? Math.min(100, Math.max(0, (item.value / item.maxValue) * 100))
                : 0;
            return (
              <div key={i} className="flex flex-col gap-2 group">
                <div className="flex justify-between items-end text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground/50 w-4">
                      {i + 1}
                    </span>
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-semibold text-muted-foreground">
                    {item.valueLabel}
                  </span>
                </div>
                <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${item.colorClass}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              Tidak ada data
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
