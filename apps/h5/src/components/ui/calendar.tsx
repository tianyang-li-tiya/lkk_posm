import * as React from "react";
import { DayPicker } from "react-day-picker";
import { zhCN } from "react-day-picker/locale";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, captionLayout = "dropdown", ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn("rdp-calendar", className)}
      captionLayout={captionLayout}
      navLayout="around"
      locale={zhCN}
      startMonth={new Date(2020, 0)}
      endMonth={new Date(2030, 11)}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft size={16} /> :
          orientation === "right" ? <ChevronRight size={16} /> :
          <ChevronDown size={12} className="rdp-chevron" />
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
