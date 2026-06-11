import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index),
  label: `${index + 1} 月`,
}));

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
  const minDate = React.useMemo(() => (min ? parseDateInput(min) : undefined), [min]);
  const maxDate = React.useMemo(() => (max ? parseDateInput(max) : undefined), [max]);
  const minTime = minDate?.getTime() ?? Number.NEGATIVE_INFINITY;
  const maxTime = maxDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const yearOptions = React.useMemo(() => buildYearOptions(maxDate, month), [maxDate, month]);
  const monthOptions = React.useMemo(() => buildMonthOptions(month.getFullYear(), maxDate), [maxDate, month]);
  const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  return (
    <div className={cn("w-72 p-3", className)}>
      <div className="mb-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={() => setMonth(previousMonth)}
        >
          <ChevronLeft />
        </Button>
        <div className="flex items-center gap-1.5">
          <Select
            value={String(month.getFullYear())}
            onValueChange={(value) => {
              const nextMonthValue = clampMonthToMax(new Date(Number(value), month.getMonth(), 1), maxDate);
              setMonth(nextMonthValue);
            }}
          >
            <SelectTrigger aria-label="选择年份" className="h-8 w-[104px] px-2 text-xs font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                  {year} 年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(month.getMonth())}
            onValueChange={(value) => setMonth(new Date(month.getFullYear(), Number(value), 1))}
          >
            <SelectTrigger aria-label="选择月份" className="h-8 w-[82px] px-2 text-xs font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          disabled={isMonthAfter(nextMonth, maxDate)}
          onClick={() => setMonth(nextMonth)}
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

function buildYearOptions(maxDate: Date | undefined, month: Date) {
  const startYear = month.getFullYear() - 20;
  const endYear = maxDate?.getFullYear() ?? month.getFullYear() + 10;
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => String(startYear + index));
}

function buildMonthOptions(year: number, maxDate: Date | undefined) {
  return MONTH_OPTIONS.filter((option) => !isMonthAfter(new Date(year, Number(option.value), 1), maxDate));
}

function clampMonthToMax(month: Date, maxDate: Date | undefined) {
  if (maxDate && isMonthAfter(month, maxDate)) return new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  return month;
}

function isMonthAfter(month: Date, maxDate: Date | undefined) {
  if (!maxDate) return false;
  return month.getFullYear() > maxDate.getFullYear() || (month.getFullYear() === maxDate.getFullYear() && month.getMonth() > maxDate.getMonth());
}
