import { useMemo } from "react";
import { useStudyStore } from "@/stores/useStudyStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

function getIntensity(minutes: number): number {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

const intensityClasses = [
  "bg-border/50",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/60",
  "bg-primary",
];

export default function StudyHeatmap() {
  const { tasks, sessions } = useStudyStore();

  const { grid, monthLabels, totalDays, totalMinutes } = useMemo(() => {
    const today = new Date();
    const daysToShow = 365;
    const dailyMinutes: Record<string, number> = {};

    // Aggregate study minutes per day
    tasks.filter((t) => t.status === "completed").forEach((t) => {
      dailyMinutes[t.date] = (dailyMinutes[t.date] || 0) + t.duration;
    });
    sessions.forEach((s) => {
      dailyMinutes[s.date] = (dailyMinutes[s.date] || 0) + s.duration;
    });

    // Build grid: 7 rows (days of week) x ~53 columns (weeks)
    const cells: { date: string; minutes: number; dayOfWeek: number; weekIndex: number }[] = [];
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysToShow + 1);

    // Align to start of week (Sunday)
    const startDow = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDow);

    const endDate = new Date(today);
    let weekIdx = 0;
    const d = new Date(startDate);
    const months: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    while (d <= endDate) {
      const dow = d.getDay();
      if (dow === 0 && d > startDate) weekIdx++;
      const dateStr = d.toISOString().split("T")[0];

      if (d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        months.push({ label: MONTHS[lastMonth], weekIndex: weekIdx });
      }

      cells.push({
        date: dateStr,
        minutes: dailyMinutes[dateStr] || 0,
        dayOfWeek: dow,
        weekIndex: weekIdx,
      });
      d.setDate(d.getDate() + 1);
    }

    const activeDays = Object.keys(dailyMinutes).length;
    const total = Object.values(dailyMinutes).reduce((a, b) => a + b, 0);

    return { grid: cells, monthLabels: months, totalDays: activeDays, totalMinutes: total };
  }, [tasks, sessions]);

  // Group cells by week
  const weeks = useMemo(() => {
    const map = new Map<number, typeof grid>();
    grid.forEach((cell) => {
      if (!map.has(cell.weekIndex)) map.set(cell.weekIndex, []);
      map.get(cell.weekIndex)!.push(cell);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [grid]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Study Activity</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{totalDays} active days</span>
          <span>·</span>
          <span>{Math.round(totalMinutes / 60)}h total</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* Month labels */}
        <div className="flex ml-8 mb-1">
          {monthLabels.map((m, i) => (
            <div
              key={`${m.label}-${i}`}
              className="text-[10px] text-muted-foreground"
              style={{ position: "relative", left: `${m.weekIndex * 14}px` }}
            >
              {i === 0 || monthLabels[i - 1]?.label !== m.label ? m.label : ""}
            </div>
          ))}
        </div>

        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col gap-[2px] mr-1 shrink-0">
            {DAYS.map((day, i) => (
              <div key={i} className="h-[12px] text-[9px] text-muted-foreground flex items-center justify-end pr-1 w-7">
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[2px]">
            {weeks.map(([weekIdx, cells]) => (
              <div key={weekIdx} className="flex flex-col gap-[2px]">
                {Array.from({ length: 7 }).map((_, dow) => {
                  const cell = cells.find((c) => c.dayOfWeek === dow);
                  if (!cell) return <div key={dow} className="w-[12px] h-[12px]" />;
                  const intensity = getIntensity(cell.minutes);
                  return (
                    <Tooltip key={dow}>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-[12px] h-[12px] rounded-[2px] ${intensityClasses[intensity]} transition-colors cursor-pointer hover:ring-1 hover:ring-primary/50`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-semibold">{cell.minutes > 0 ? `${cell.minutes} min` : "No activity"}</p>
                        <p className="text-muted-foreground">{new Date(cell.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[10px] text-muted-foreground mr-1">Less</span>
        {intensityClasses.map((cls, i) => (
          <div key={i} className={`w-[12px] h-[12px] rounded-[2px] ${cls}`} />
        ))}
        <span className="text-[10px] text-muted-foreground ml-1">More</span>
      </div>
    </div>
  );
}
