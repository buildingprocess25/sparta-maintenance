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
    <Card className="flex flex-col shadow-sm border-muted/60 h-full">
      <CardHeader className="pb-2 pt-3 px-3 border-b bg-muted/20">
        <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase leading-tight line-clamp-2 min-h-8 flex items-center">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 flex-1">
        <div className="flex flex-col justify-between h-full space-y-2.5">
          {items.map((item, i) => {
            const percentage =
              item.maxValue > 0
                ? Math.min(100, Math.max(0, (item.value / item.maxValue) * 100))
                : 0;
            return (
              <div key={i} className="flex flex-col gap-1.5 group">
                <div className="flex justify-between items-end text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-muted-foreground/50 w-4">
                      {i + 1}
                    </span>
                    <span
                      className="font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[120px] xl:max-w-[150px]"
                      title={item.label}
                    >
                      {item.label}
                    </span>
                  </div>
                  <span className="font-semibold text-muted-foreground">
                    {item.valueLabel}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
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
