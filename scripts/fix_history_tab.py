filepath = "app/reports/[reportNumber]/report-detail-view.tsx"
with open(filepath, "r") as f:
    lines = f.readlines()

# Lines to replace: 1976 to 2089 (0-indexed: 1975 to 2088) — old history block
# Keep everything before line 1975 (0-indexed) and after line 2088 (inclusive)

start = 1975  # 0-indexed, line 1976 where pendingEstimationLabel starts
end   = 2088  # 0-indexed, last line })} 

new_block = """\
                                                        return (
                                                            <div
                                                                key={i}
                                                                className="relative pl-6"
                                                            >
                                                                {/* Timeline Dot */}
                                                                <div
                                                                    className={cn(
                                                                        "absolute -left-1.25 top-1 h-2.5 w-2.5 rounded-full border-2 bg-background transition-colors",
                                                                        isNegative
                                                                            ? "border-red-500 bg-red-50"
                                                                            : isPositive
                                                                              ? "border-green-500 bg-green-50"
                                                                              : "border-muted-foreground",
                                                                    )}
                                                                />

                                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-1">
                                                                    <div className="font-medium text-sm">
                                                                        {
                                                                            cfg.label
                                                                        }
                                                                    </div>
                                                                    <span className="text-xs text-muted-foreground font-mono">
                                                                        {formatDate(
                                                                            entry.createdAt,
                                                                        )}{" "}
                                                                        \u2022{" "}
                                                                        {formatTime(
                                                                            entry.createdAt,
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                <div className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                                                                    <User className="h-3 w-3" />
                                                                    <span>
                                                                        {
                                                                            entry.actorName
                                                                        }
                                                                    </span>
                                                                </div>

                                                                {entry.notes && (
                                                                    <div className="bg-muted/30 p-3 rounded-md border border-border/50 text-xs italic text-muted-foreground relative">
                                                                        <span className="absolute top-2 left-2 text-muted-foreground/20 text-xl font-serif leading-none">
                                                                            "
                                                                        </span>
                                                                        <span className="pl-3 relative z-10">
                                                                            {
                                                                                entry.notes
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    },
                                                )}
"""

# Print line 1974-1978 to confirm position
print("Lines around start (1-indexed 1975-1980):")
for i in range(1974, 1980):
    print(f"  {i+1}: {repr(lines[i])}")

print(f"\nLine {end+1} (to be last replaced):")
print(repr(lines[end]))

# Check line 1973 content (0-indexed 1972)
print("\nLine 1974:")
print(repr(lines[1973]))

# Do the replacement: keep lines[0:start-1] + new_block + lines[end+1:]
# But we need to keep the "cfg.negative;" part of line start-1
# Actually the first replacement already set: 
#   line 1972 (0-indexed) = "                                                        const isNegative ="
#   line 1973 (0-indexed) = "                                                            cfg.negative;"
# So we want to replace from line 1975 (0-indexed, the pendingEstimationLabel) to line 2088

print(f"\nWill replace lines {start+1} to {end+1} (1-indexed) with new block")

result_lines = lines[:start] + [new_block] + lines[end+1:]

with open(filepath, "w") as f:
    f.writelines(result_lines)

print("Done!")
