import { CalendarDays } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateLabel } from "@/lib/format";

type DatePickerProps = {
  value: string;
  min: string;
  max: string;
  onChange: (date: string) => void;
};

export function DatePicker({ value, min, max, onChange }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-[180px] justify-start font-normal">
          <CalendarDays />
          {value ? dateLabel(value) : "开始日期"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <Calendar
          selected={value}
          min={min}
          max={max}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
