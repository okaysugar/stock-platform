import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { parseDateInput, toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";

type CalendarProps = {
  selected?: string;
  onSelect: (date: string) => void;
  min?: string;
  max?: string;
  className?: string;
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export function Calendar({ selected, onSelect, min, max, className }: CalendarProps) {
  const [month, setMonth] = React.useState(() => {
    const base = selected ? parseDateInput(selected) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  React.useEffect(() => {
    if (selected) {
      const next = parseDateInput(selected);
      setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  }, [selected]);

  const days = React.useMemo(() => buildMonthDays(month), [month]);
  const minTime = min ? parseDateInput(min).getTime() : Number.NEGATIVE_INFINITY;
  const maxTime = max ? parseDateInput(max).getTime() : Number.POSITIVE_INFINITY;

  return (
    <div className={cn("w-72 p-3", className)}>
      <div className="mb-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          <ChevronLeft />
        </Button>
        <div className="text-sm font-medium text-foreground">
          {month.getFullYear()} 年 {month.getMonth() + 1} 月
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="size-8" />;
          const value = toDateInputValue(date);
          const isSelected = value === selected;
          const disabled = date.getTime() < minTime || date.getTime() > maxTime || date.getDay() === 0 || date.getDay() === 6;
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(value)}
              className={cn(
                "size-8 rounded-md text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:text-muted-foreground/30",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildMonthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const leading = (first.getDay() + 6) % 7;
  const days: Array<Date | null> = Array.from({ length: leading }, () => null);

  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (days.length % 7 !== 0) days.push(null);
  return days;
}
